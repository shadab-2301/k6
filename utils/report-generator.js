import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';

/**
 * Report Generator - Creates HTML performance test reports
 */
export class ReportGenerator {
  constructor(testName, environment) {
    this.testName = testName;
    this.environment = environment;
    this.issues = [];
    this.testStartTime = new Date();
  }

  /**
   * Add an issue to the report
   */
  addIssue(issueData) {
    this.issues.push({
      timestamp: new Date().toISOString(),
      ...issueData
    });
  }

  /**
   * Generate HTML report
   */
  generateHTML(metrics, endpoints) {
    const testEndTime = new Date();
    const duration = (testEndTime - this.testStartTime) / 1000;
    
    const httpReqDuration = metrics.http_req_duration?.values || {};
    const httpReqFailed = metrics.http_req_failed?.values || {};
    const httpReqs = metrics.http_reqs?.values || {};
    
    const summary = {
      totalRequests: httpReqs.count || 0,
      failureRate: ((httpReqFailed.rate || 0) * 100).toFixed(2),
      avgDuration: Math.round(httpReqDuration.avg || 0),
      p95Duration: Math.round(httpReqDuration['p(95)'] || 0),
      p99Duration: Math.round(httpReqDuration['p(99)'] || 0),
      maxDuration: Math.round(httpReqDuration.max || 0),
      minDuration: Math.round(httpReqDuration.min || 0)
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Test Report - ${this.testName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header p {
            opacity: 0.9;
            font-size: 1.1em;
        }
        
        .metadata {
            background: #f8f9fa;
            padding: 20px 40px;
            border-bottom: 1px solid #e9ecef;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        
        .metadata-item {
            padding: 15px;
            background: white;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        
        .metadata-item label {
            display: block;
            color: #6c757d;
            font-size: 0.85em;
            font-weight: 600;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        
        .metadata-item value {
            display: block;
            color: #212529;
            font-size: 1.2em;
            font-weight: 500;
        }
        
        .content {
            padding: 40px;
        }
        
        .section {
            margin-bottom: 40px;
        }
        
        .section h2 {
            color: #667eea;
            font-size: 1.8em;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .metric-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }
        
        .metric-card.success {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        }
        
        .metric-card.warning {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        
        .metric-card .label {
            font-size: 0.9em;
            opacity: 0.9;
            margin-bottom: 10px;
        }
        
        .metric-card .value {
            font-size: 2em;
            font-weight: bold;
        }
        
        .issue-item {
            background: #f8f9fa;
            border-left: 4px solid #f5576c;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 8px;
        }
        
        .issue-item.critical {
            border-left-color: #f5576c;
            background-color: #fff5f6;
        }
        
        .issue-item.high {
            border-left-color: #f5576c;
            background-color: #fff5f6;
        }
        
        .issue-item.medium {
            border-left-color: #f093fb;
            background-color: #fff8fb;
        }
        
        .issue-item.low {
            border-left-color: #ffd89b;
            background-color: #fffbf0;
        }
        
        .issue-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .issue-title {
            font-size: 1.3em;
            font-weight: 600;
            color: #212529;
        }
        
        .priority-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .priority-badge.critical,
        .priority-badge.high {
            background: #f5576c;
            color: white;
        }
        
        .priority-badge.medium {
            background: #f093fb;
            color: white;
        }
        
        .priority-badge.low {
            background: #ffd89b;
            color: #333;
        }
        
        .issue-section {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid rgba(0,0,0,0.1);
        }
        
        .issue-section-title {
            font-weight: 600;
            color: #667eea;
            font-size: 0.95em;
            margin-bottom: 8px;
            text-transform: uppercase;
        }
        
        .issue-section-content {
            color: #555;
            line-height: 1.6;
            font-size: 0.95em;
        }
        
        .no-issues {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px;
            font-size: 1.1em;
        }
        
        .endpoint-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        
        .endpoint-table th,
        .endpoint-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }
        
        .endpoint-table th {
            background: #667eea;
            color: white;
            font-weight: 600;
        }
        
        .endpoint-table tr:hover {
            background: #f8f9fa;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.85em;
            font-weight: 600;
        }
        
        .status-badge.pass {
            background: #d4edda;
            color: #155724;
        }
        
        .status-badge.fail {
            background: #f8d7da;
            color: #721c24;
        }
        
        .footer {
            background: #f8f9fa;
            padding: 20px 40px;
            border-top: 1px solid #dee2e6;
            text-align: center;
            color: #6c757d;
            font-size: 0.9em;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            .container {
                box-shadow: none;
                border-radius: 0;
            }
        }
        
        .chart-container {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border: 1px solid #dee2e6;
        }
        
        .recommendation-item {
            background: #e7f3ff;
            border-left: 4px solid #2196F3;
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 4px;
            color: #1565c0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚡ Performance Test Report</h1>
            <p>${this.testName} - ${this.environment.toUpperCase()} Environment</p>
        </div>
        
        <div class="metadata">
            <div class="metadata-item">
                <label>Test Start</label>
                <value>${this.testStartTime.toLocaleString()}</value>
            </div>
            <div class="metadata-item">
                <label>Duration</label>
                <value>${duration.toFixed(1)}s</value>
            </div>
            <div class="metadata-item">
                <label>Total Requests</label>
                <value>${summary.totalRequests}</value>
            </div>
            <div class="metadata-item">
                <label>Failure Rate</label>
                <value>${summary.failureRate}%</value>
            </div>
        </div>
        
        <div class="content">
            <!-- PERFORMANCE METRICS SECTION -->
            <div class="section">
                <h2>📊 Performance Metrics</h2>
                <div class="metrics-grid">
                    <div class="metric-card success">
                        <div class="label">Average Response Time</div>
                        <div class="value">${summary.avgDuration}ms</div>
                    </div>
                    <div class="metric-card">
                        <div class="label">P95 Response Time</div>
                        <div class="value">${summary.p95Duration}ms</div>
                    </div>
                    <div class="metric-card">
                        <div class="label">P99 Response Time</div>
                        <div class="value">${summary.p99Duration}ms</div>
                    </div>
                    <div class="metric-card ${summary.failureRate > 1 ? 'warning' : 'success'}">
                        <div class="label">Failure Rate</div>
                        <div class="value">${summary.failureRate}%</div>
                    </div>
                </div>
                
                <table class="endpoint-table">
                    <thead>
                        <tr>
                            <th>Endpoint</th>
                            <th>Method</th>
                            <th>P95 (ms)</th>
                            <th>Success Rate</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${endpoints.map(ep => `
                            <tr>
                                <td>${ep.path}</td>
                                <td>${ep.method}</td>
                                <td>${ep.p95 || 'N/A'}</td>
                                <td>${ep.successRate || '100%'}</td>
                                <td><span class="status-badge ${ep.status === 'pass' ? 'pass' : 'fail'}">${ep.status === 'pass' ? '✅ PASS' : '⚠️ FAIL'}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <!-- ISSUES SECTION -->
            <div class="section">
                <h2>🚨 Performance Issues</h2>
                ${this.issues.length === 0 ? `
                    <div class="no-issues">
                        ✅ No performance issues detected! All metrics within acceptable thresholds.
                    </div>
                ` : `
                    ${this.issues.map(issue => `
                        <div class="issue-item ${issue.priority}">
                            <div class="issue-header">
                                <div class="issue-title">${issue.title}</div>
                                <span class="priority-badge ${issue.priority}">${issue.priority}</span>
                            </div>
                            
                            ${issue.observation ? `
                                <div class="issue-section">
                                    <div class="issue-section-title">📌 Observation</div>
                                    <div class="issue-section-content">${issue.observation}</div>
                                </div>
                            ` : ''}
                            
                            ${issue.impact ? `
                                <div class="issue-section">
                                    <div class="issue-section-title">💥 Impact</div>
                                    <div class="issue-section-content">${issue.impact}</div>
                                </div>
                            ` : ''}
                            
                            ${issue.recommendations ? `
                                <div class="issue-section">
                                    <div class="issue-section-title">✅ Recommended Solutions</div>
                                    <div class="issue-section-content">
                                        ${Array.isArray(issue.recommendations) ? 
                                            issue.recommendations.map(rec => `<div class="recommendation-item">• ${rec}</div>`).join('') :
                                            `<div class="recommendation-item">• ${issue.recommendations}</div>`
                                        }
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                `}
            </div>
            
            <!-- RECOMMENDATIONS SECTION -->
            <div class="section">
                <h2>💡 General Recommendations</h2>
                <div class="recommendation-item">• Monitor metrics regularly and establish performance baselines</div>
                <div class="recommendation-item">• Implement alerts for when metrics exceed thresholds</div>
                <div class="recommendation-item">• Test after each deployment to catch regressions early</div>
                <div class="recommendation-item">• Scale infrastructure based on identified bottlenecks</div>
                <div class="recommendation-item">• Re-run tests after implementing fixes to validate improvements</div>
            </div>
        </div>
        
        <div class="footer">
            <p>Generated on ${testEndTime.toLocaleString()} | Performance Testing Framework v1.0</p>
        </div>
    </div>
</body>
</html>
    `;
  }
}
