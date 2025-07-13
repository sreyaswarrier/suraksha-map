"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Download, TrendingUp, TrendingDown, BarChart3, PieChart, MapPin, Calendar, Filter } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

declare global {
  interface Window {
    google: any;
  }
}

interface Report {
  id: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  location: {
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    state: string;
    country: string;
  };
  createdAt: string;
  updatedAt: string;
  title: string;
  description: string;
}

interface AnalyticsFilters {
  dateRange: string;
  category: string;
  status?: string;
  priority?: string;
}

interface AnalyticsProps {
  reports: Report[];
  loading: boolean;
  onFilterChange: (filters: AnalyticsFilters) => void;
}

interface ChartData {
  labels: string[];
  values: number[];
  colors?: string[];
}

interface KPIMetric {
  label: string;
  value: number | string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
}

const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#8b5cf6',
  success: '#10b981',
  muted: '#64748b'
};

const PRIORITY_COLORS = {
  Low: '#10b981',
  Medium: '#f59e0b', 
  High: '#ef4444',
  Critical: '#dc2626'
};

const STATUS_COLORS = {
  Open: '#ef4444',
  'In Progress': '#f59e0b',
  Resolved: '#10b981',
  Closed: '#64748b'
};

export const AnalyticsComponent: React.FC<AnalyticsProps> = ({
  reports,
  loading,
  onFilterChange
}) => {
  const [googleChartsLoaded, setGoogleChartsLoaded] = useState(false);
  const [googleChartsError, setGoogleChartsError] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState<AnalyticsFilters>({
    dateRange: '30',
    category: 'all'
  });
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const chartRefs = {
    categoryPie: useRef<HTMLDivElement>(null),
    priorityBar: useRef<HTMLDivElement>(null),
    statusLine: useRef<HTMLDivElement>(null),
    geoMap: useRef<HTMLDivElement>(null),
    trendsLine: useRef<HTMLDivElement>(null)
  };

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);  
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load Google Charts
  useEffect(() => {
    if (isOffline) return;

    const loadGoogleCharts = () => {
      if (window.google?.charts) {
        setGoogleChartsLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://www.gstatic.com/charts/loader.js';
      script.onload = () => {
        window.google.charts.load('current', {
          packages: ['corechart', 'geochart', 'bar'],
          mapsApiKey: 'Replace With Your Maps API KEY'
        });
        window.google.charts.setOnLoadCallback(() => {
          setGoogleChartsLoaded(true);
        });
      };
      script.onerror = () => {
        setGoogleChartsError(true);
      };
      document.head.appendChild(script);
    };

    loadGoogleCharts();
  }, [isOffline]);

  // Filter reports based on current filters
  const filteredReports = useMemo(() => {
    let filtered = [...reports];

    // Date range filter
    const now = new Date();
    const daysBack = parseInt(filters.dateRange);
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    
    filtered = filtered.filter(report => 
      new Date(report.createdAt) >= startDate
    );

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(report => report.category === filters.category);
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(report => report.status === filters.status);
    }

    // Priority filter
    if (filters.priority && filters.priority !== 'all') {
      filtered = filtered.filter(report => report.priority === filters.priority);
    }

    return filtered;
  }, [reports, filters]);

  // Calculate analytics data
  const analyticsData = useMemo(() => {
    const categoryData = filteredReports.reduce((acc, report) => {
      acc[report.category] = (acc[report.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const priorityData = filteredReports.reduce((acc, report) => {
      acc[report.priority] = (acc[report.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusData = filteredReports.reduce((acc, report) => {
      acc[report.status] = (acc[report.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const locationData = filteredReports.reduce((acc, report) => {
      const key = `${report.location.city}, ${report.location.state}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Time-based trends (last 7 days)
    const trendsData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayReports = filteredReports.filter(report => {
        const reportDate = new Date(report.createdAt);
        return reportDate.toDateString() === date.toDateString();
      });
      trendsData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: dayReports.length
      });
    }

    return {
      category: {
        labels: Object.keys(categoryData),
        values: Object.values(categoryData),
        colors: Object.keys(categoryData).map((_, index) => 
          Object.values(CHART_COLORS)[index % Object.values(CHART_COLORS).length]
        )
      },
      priority: {
        labels: Object.keys(priorityData),
        values: Object.values(priorityData),
        colors: Object.keys(priorityData).map(priority => PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS])
      },
      status: {
        labels: Object.keys(statusData),
        values: Object.values(statusData),
        colors: Object.keys(statusData).map(status => STATUS_COLORS[status as keyof typeof STATUS_COLORS])
      },
      location: {
        labels: Object.keys(locationData),
        values: Object.values(locationData)
      },
      trends: trendsData
    };
  }, [filteredReports]);

  // Calculate KPIs
  const kpiMetrics: KPIMetric[] = useMemo(() => {
    const totalReports = filteredReports.length;
    const openReports = filteredReports.filter(r => r.status === 'Open').length;
    const resolvedReports = filteredReports.filter(r => r.status === 'Resolved').length;
    const criticalReports = filteredReports.filter(r => r.priority === 'Critical').length;
    
    // Calculate trends (compare with previous period)
    const periodDays = parseInt(filters.dateRange);
    const prevPeriodStart = new Date();
    prevPeriodStart.setDate(prevPeriodStart.getDate() - (periodDays * 2));
    const prevPeriodEnd = new Date();
    prevPeriodEnd.setDate(prevPeriodEnd.getDate() - periodDays);
    
    const prevPeriodReports = reports.filter(report => {
      const reportDate = new Date(report.createdAt);
      return reportDate >= prevPeriodStart && reportDate <= prevPeriodEnd;
    });

    const totalChange = prevPeriodReports.length ? 
      ((totalReports - prevPeriodReports.length) / prevPeriodReports.length) * 100 : 0;

    return [
      {
        label: 'Total Reports',
        value: totalReports,
        change: totalChange,
        trend: totalChange > 0 ? 'up' : totalChange < 0 ? 'down' : 'stable',
        icon: <BarChart3 className="h-4 w-4" />
      },
      {
        label: 'Open Reports',
        value: openReports,
        change: 0,
        trend: 'stable',
        icon: <AlertCircle className="h-4 w-4" />
      },
      {
        label: 'Resolution Rate',
        value: totalReports > 0 ? `${Math.round((resolvedReports / totalReports) * 100)}%` : '0%',
        change: 0,
        trend: 'stable',
        icon: <TrendingUp className="h-4 w-4" />
      },
      {
        label: 'Critical Issues',
        value: criticalReports,
        change: 0,
        trend: 'stable',
        icon: <AlertCircle className="h-4 w-4" />
      }
    ];
  }, [filteredReports, reports, filters.dateRange]);

  // Google Charts rendering functions
  const drawGoogleChart = useCallback((elementRef: React.RefObject<HTMLDivElement>, type: string, data: any, options: any) => {
    if (!googleChartsLoaded || !elementRef.current) return;

    let chart;
    switch (type) {
      case 'pie':
        chart = new window.google.visualization.PieChart(elementRef.current);
        break;
      case 'bar':
        chart = new window.google.visualization.ColumnChart(elementRef.current);
        break;
      case 'line':
        chart = new window.google.visualization.LineChart(elementRef.current);
        break;
      case 'geo':
        chart = new window.google.visualization.GeoChart(elementRef.current);
        break;
      default:
        return;
    }

    chart.draw(data, options);
  }, [googleChartsLoaded]);

  // Fallback SVG chart components
  const FallbackPieChart: React.FC<{ data: ChartData; title: string }> = ({ data, title }) => (
    <div className="w-full h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
      <div className="text-center">
        <PieChart className="h-12 w-12 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-xs text-gray-400">Offline mode - detailed chart unavailable</p>
        <div className="mt-4 space-y-2">
          {data.labels.map((label, index) => (
            <div key={label} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: data.colors?.[index] || CHART_COLORS.primary }}
                />
                <span>{label}</span>
              </div>
              <span className="font-medium">{data.values[index]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const FallbackBarChart: React.FC<{ data: ChartData; title: string }> = ({ data, title }) => (
    <div className="w-full h-64 p-4">
      <h4 className="text-sm font-medium mb-4 text-center">{title}</h4>
      <div className="h-48 flex items-end justify-around gap-2">
        {data.values.map((value, index) => {
          const maxValue = Math.max(...data.values);
          const height = (value / maxValue) * 100;
          return (
            <div key={data.labels[index]} className="flex flex-col items-center flex-1">
              <div className="text-xs mb-1">{value}</div>
              <div 
                className="w-full rounded-t"
                style={{ 
                  height: `${height}%`,
                  backgroundColor: data.colors?.[index] || CHART_COLORS.primary,
                  minHeight: '4px'
                }}
              />
              <div className="text-xs mt-1 text-center truncate w-full">{data.labels[index]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Render Google Charts
  useEffect(() => {
    if (!googleChartsLoaded) return;

    // Category pie chart
    if (analyticsData.category.labels.length > 0) {
      const categoryGoogleData = new window.google.visualization.DataTable();
      categoryGoogleData.addColumn('string', 'Category');
      categoryGoogleData.addColumn('number', 'Count');
      
      const rows = analyticsData.category.labels.map((label, index) => [
        label, analyticsData.category.values[index]
      ]);
      categoryGoogleData.addRows(rows);

      drawGoogleChart(chartRefs.categoryPie, 'pie', categoryGoogleData, {
        title: 'Reports by Category',
        pieHole: 0.4,
        colors: analyticsData.category.colors,
        backgroundColor: 'transparent',
        legend: { position: 'bottom' },
        chartArea: { width: '90%', height: '80%' }
      });
    }

    // Priority bar chart
    if (analyticsData.priority.labels.length > 0) {
      const priorityGoogleData = new window.google.visualization.DataTable();
      priorityGoogleData.addColumn('string', 'Priority');
      priorityGoogleData.addColumn('number', 'Count');
      
      const rows = analyticsData.priority.labels.map((label, index) => [
        label, analyticsData.priority.values[index]
      ]);
      priorityGoogleData.addRows(rows);

      drawGoogleChart(chartRefs.priorityBar, 'bar', priorityGoogleData, {
        title: 'Reports by Priority',
        colors: analyticsData.priority.colors,
        backgroundColor: 'transparent',
        legend: { position: 'none' },
        chartArea: { width: '80%', height: '70%' }
      });
    }

    // Trends line chart
    if (analyticsData.trends.length > 0) {
      const trendsGoogleData = new window.google.visualization.DataTable();
      trendsGoogleData.addColumn('string', 'Date');
      trendsGoogleData.addColumn('number', 'Reports');
      
      const rows = analyticsData.trends.map(trend => [trend.date, trend.count]);
      trendsGoogleData.addRows(rows);

      drawGoogleChart(chartRefs.trendsLine, 'line', trendsGoogleData, {
        title: 'Reports Trend (Last 7 Days)',
        colors: [CHART_COLORS.primary],
        backgroundColor: 'transparent',
        legend: { position: 'none' },
        chartArea: { width: '80%', height: '70%' },
        hAxis: { title: 'Date' },
        vAxis: { title: 'Number of Reports', minValue: 0 }
      });
    }
  }, [googleChartsLoaded, analyticsData, drawGoogleChart]);

  // Handle filter changes
  const handleFilterChange = (key: keyof AnalyticsFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  // Export data functionality
  const exportData = () => {
    const exportData = {
      summary: {
        totalReports: filteredReports.length,
        dateRange: filters.dateRange,
        generatedAt: new Date().toISOString()
      },
      kpis: kpiMetrics,
      distribution: {
        category: analyticsData.category,
        priority: analyticsData.priority,
        status: analyticsData.status
      },
      trends: analyticsData.trends,
      reports: filteredReports
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(reports.map(r => r.category)));
    return ['all', ...uniqueCategories];
  }, [reports]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="h-64 bg-gray-200 rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Alerts */}
      {(isOffline || googleChartsError) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {isOffline 
              ? "You're currently offline. Showing basic analytics with fallback charts." 
              : "Google Charts failed to load. Showing fallback charts."
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Analytics Filters
              </CardTitle>
              <CardDescription>
                Filter data to customize your analytics view
              </CardDescription>
            </div>
            <Button onClick={exportData} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange('dateRange', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Priority</label>
              <Select value={filters.priority || 'all'} onValueChange={(value) => handleFilterChange('priority', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiMetrics.map((metric, index) => (
          <Card key={index} className="transition-shadow hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  {metric.icon}
                  <span className="text-sm font-medium">{metric.label}</span>
                </div>
                {metric.change !== 0 && (
                  <Badge variant={metric.trend === 'up' ? 'default' : metric.trend === 'down' ? 'destructive' : 'secondary'}>
                    {metric.trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : 
                     metric.trend === 'down' ? <TrendingDown className="h-3 w-3 mr-1" /> : null}
                    {Math.abs(metric.change).toFixed(1)}%
                  </Badge>
                )}
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">{metric.value}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="geography">Geography</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Category Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {googleChartsLoaded && !isOffline && !googleChartsError ? (
                  <div ref={chartRefs.categoryPie} className="h-64" />
                ) : (
                  <FallbackPieChart data={analyticsData.category} title="Category Distribution" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />  
                  Priority Levels
                </CardTitle>
              </CardHeader>
              <CardContent>
                {googleChartsLoaded && !isOffline && !googleChartsError ? (
                  <div ref={chartRefs.priorityBar} className="h-64" />
                ) : (
                  <FallbackBarChart data={analyticsData.priority} title="Priority Distribution" />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="distribution">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <FallbackBarChart data={analyticsData.status} title="Status Distribution" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.category.labels.map((label, index) => {
                    const percentage = analyticsData.category.values.reduce((sum, val) => sum + val, 0) > 0 
                      ? (analyticsData.category.values[index] / analyticsData.category.values.reduce((sum, val) => sum + val, 0)) * 100
                      : 0;
                    
                    return (
                      <div key={label} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{label}</span>
                          <span className="text-sm text-muted-foreground">
                            {analyticsData.category.values[index]} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all duration-500 ease-out"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: analyticsData.category.colors?.[index] || CHART_COLORS.primary
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Report Trends (Last 7 Days)
              </CardTitle>
              <CardDescription>
                Daily report submission patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {googleChartsLoaded && !isOffline && !googleChartsError ? (
                <div ref={chartRefs.trendsLine} className="h-80" />
              ) : (
                <div className="h-80 p-4">
                  <div className="h-full flex items-end justify-around border-l border-b border-gray-200">
                    {analyticsData.trends.map((trend, index) => {
                      const maxCount = Math.max(...analyticsData.trends.map(t => t.count));
                      const height = maxCount > 0 ? (trend.count / maxCount) * 80 : 0;
                      
                      return (
                        <div key={index} className="flex flex-col items-center">
                          <div className="text-xs mb-2">{trend.count}</div>
                          <div 
                            className="w-8 bg-primary rounded-t transition-all duration-500"
                            style={{ height: `${height}%`, minHeight: trend.count > 0 ? '4px' : '0' }}
                          />
                          <div className="text-xs mt-2 rotate-45 origin-bottom-left">{trend.date}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geography">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Geographic Distribution
              </CardTitle>
              <CardDescription>
                Reports by location
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isOffline || googleChartsError ? (
                <div className="h-80 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500">Geographic Map</p>
                    <p className="text-xs text-gray-400">Requires internet connection</p>
                    <div className="mt-4 max-w-md">
                      {analyticsData.location.labels.slice(0, 10).map((location, index) => (
                        <div key={location} className="flex justify-between items-center py-1 text-sm">
                          <span className="truncate">{location}</span>
                          <Badge variant="outline">{analyticsData.location.values[index]}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div ref={chartRefs.geoMap} className="h-80" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
