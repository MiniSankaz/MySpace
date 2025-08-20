#!/usr/bin/env tsx

/**
 * Example: Full Codebase Analysis
 * Demonstrates complete analysis workflow
 */

import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';

const API_URL = 'http://localhost:4192';

async function main() {
  console.log(chalk.cyan.bold('\n🚀 Full Codebase Analysis Example\n'));
  
  try {
    // Step 1: Build Index
    console.log(chalk.yellow('Step 1: Building code index...'));
    const indexSpinner = ora('Indexing codebase...').start();
    
    await axios.post(`${API_URL}/api/v1/index/build`, {
      extractSymbols: true,
      detectDependencies: true,
      patterns: ['**/*.ts', '**/*.tsx']
    });
    
    // Wait for indexing to complete
    let indexingComplete = false;
    while (!indexingComplete) {
      const statusResponse = await axios.get(`${API_URL}/api/v1/index/status`);
      const status = statusResponse.data;
      
      indexSpinner.text = `Indexing: ${status.progress.toFixed(2)}% (${status.indexedFiles}/${status.totalFiles})`;
      
      if (!status.isRunning) {
        indexingComplete = true;
        indexSpinner.succeed(chalk.green(`Indexed ${status.indexedFiles} files`));
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Step 2: Get Metrics
    console.log(chalk.yellow('\nStep 2: Analyzing metrics...'));
    const metricsResponse = await axios.get(`${API_URL}/api/v1/index/metrics`);
    const metrics = metricsResponse.data;
    
    console.log(chalk.cyan('📊 Codebase Metrics:'));
    console.log(`  Total Files: ${metrics.totalFiles}`);
    console.log(`  Total Lines: ${metrics.totalLines.toLocaleString()}`);
    console.log(`  Total Symbols: ${metrics.totalSymbols}`);
    console.log(`  Total Dependencies: ${metrics.totalDependencies}`);
    
    // Step 3: Search and Analyze Files
    console.log(chalk.yellow('\nStep 3: Analyzing files for issues...'));
    
    const searchResponse = await axios.get(`${API_URL}/api/v1/index/search`, {
      params: { pattern: '*', limit: 100 }
    });
    
    const files = searchResponse.data;
    const analysisSpinner = ora('Analyzing files...').start();
    
    let totalMarkings = 0;
    const criticalFiles: any[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      analysisSpinner.text = `Analyzing ${i + 1}/${files.length}: ${file.relativePath}`;
      
      // Analyze file
      await axios.post(`${API_URL}/api/v1/markings/analyze`, {
        fileId: file.id,
        options: {
          detectDuplicates: true,
          analyzeComplexity: true,
          checkPatterns: true,
          checkSecurity: true,
          checkPerformance: true,
          checkNaming: true,
          checkUnused: true
        }
      });
      
      // Get markings
      const markingsResponse = await axios.get(`${API_URL}/api/v1/markings/file/${file.id}`);
      const markings = markingsResponse.data;
      
      totalMarkings += markings.length;
      
      // Track files with critical issues
      const criticalMarkings = markings.filter((m: any) => 
        m.severity === 'CRITICAL' || m.severity === 'HIGH'
      );
      
      if (criticalMarkings.length > 0) {
        criticalFiles.push({
          path: file.relativePath,
          criticalCount: criticalMarkings.length,
          markings: criticalMarkings
        });
      }
    }
    
    analysisSpinner.succeed(chalk.green(`Analysis complete: ${totalMarkings} issues found`));
    
    // Step 4: Display Results
    console.log(chalk.yellow('\nStep 4: Analysis Results'));
    
    // Get overall statistics
    const statsResponse = await axios.get(`${API_URL}/api/v1/markings/stats`);
    const stats = statsResponse.data;
    
    console.log(chalk.cyan('\n📈 Issue Distribution:'));
    
    // By Severity
    console.log(chalk.white('\n  By Severity:'));
    stats.bySeverity.forEach((s: any) => {
      const icon = getSeverityIcon(s.severity);
      console.log(`    ${icon} ${s.severity}: ${s.count}`);
    });
    
    // By Type
    console.log(chalk.white('\n  By Type:'));
    stats.byType
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5)
      .forEach((t: any) => {
        console.log(`    • ${t.type}: ${t.count}`);
      });
    
    // Critical Files
    if (criticalFiles.length > 0) {
      console.log(chalk.red.bold('\n⚠️  Files with Critical Issues:'));
      criticalFiles
        .sort((a, b) => b.criticalCount - a.criticalCount)
        .slice(0, 10)
        .forEach(file => {
          console.log(`  ${chalk.red('•')} ${file.path} (${file.criticalCount} critical issues)`);
        });
    }
    
    // Step 5: Pattern Analysis
    console.log(chalk.yellow('\nStep 5: Pattern Analysis'));
    
    const patternStatsResponse = await axios.get(`${API_URL}/api/v1/patterns/stats`);
    const patternStats = patternStatsResponse.data;
    
    console.log(chalk.cyan('\n🔍 Common Patterns Detected:'));
    patternStats
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5)
      .forEach((p: any) => {
        console.log(`  • ${p.pattern} (${p.category}): ${p.count} occurrences`);
      });
    
    // Step 6: Recommendations
    console.log(chalk.yellow('\nStep 6: Recommendations'));
    
    // Use AI to generate recommendations
    const recommendationTask = {
      type: 'TECHNICAL_ARCHITECT',
      prompt: `Based on the analysis results, provide top 5 recommendations for improving the codebase:
               Total Issues: ${totalMarkings}
               Critical Files: ${criticalFiles.length}
               Main Issue Types: ${stats.byType.slice(0, 3).map((t: any) => t.type).join(', ')}`,
      context: { stats, criticalFiles: criticalFiles.slice(0, 5) }
    };
    
    const agentSpinner = ora('Generating AI recommendations...').start();
    
    try {
      const agentResponse = await axios.post(`${API_URL}/api/v1/agents/spawn`, recommendationTask);
      
      if (agentResponse.data.status === 'success') {
        agentSpinner.succeed('Recommendations generated');
        console.log(chalk.cyan('\n💡 AI Recommendations:'));
        console.log(agentResponse.data.result);
      } else {
        agentSpinner.warn('Could not generate recommendations');
      }
    } catch (error) {
      agentSpinner.warn('AI service unavailable');
    }
    
    // Summary
    console.log(chalk.green.bold('\n✅ Analysis Complete!\n'));
    console.log(chalk.white('Summary:'));
    console.log(`  • Files Analyzed: ${files.length}`);
    console.log(`  • Total Issues: ${totalMarkings}`);
    console.log(`  • Critical Files: ${criticalFiles.length}`);
    console.log(`  • Average Issues per File: ${(totalMarkings / files.length).toFixed(2)}`);
    
    // Next steps
    console.log(chalk.cyan('\n📝 Next Steps:'));
    console.log('  1. Review critical issues: npx tsx src/cli/mark-cli.ts review <fileId>');
    console.log('  2. Create refactoring plans: npx tsx src/cli/refactor-cli.ts plan <fileId>');
    console.log('  3. Execute batch refactoring: npx tsx src/cli/refactor-cli.ts batch');
    
  } catch (error: any) {
    console.error(chalk.red('\n❌ Analysis failed:'));
    console.error(error.response?.data || error.message);
    process.exit(1);
  }
}

function getSeverityIcon(severity: string): string {
  switch (severity) {
    case 'CRITICAL':
      return chalk.red('🔴');
    case 'HIGH':
      return chalk.red('🟠');
    case 'MEDIUM':
      return chalk.yellow('🟡');
    case 'LOW':
      return chalk.blue('🔵');
    case 'INFO':
      return chalk.gray('⚪');
    default:
      return '•';
  }
}

// Run the example
main().catch(console.error);