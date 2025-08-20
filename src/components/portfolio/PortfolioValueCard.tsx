/**
 * Portfolio Value Card Component with Thai Baht Currency Support
 * Example implementation showing proper currency formatting
 */

"use client";

import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { CurrencyToggle, CurrencyDisplay } from '@/components/portfolio/CurrencyToggle';
import { useCurrencyPreference } from '@/hooks/useCurrencyPreference';
import { 
  formatCurrency, 
  formatPercent, 
  convertCurrency, 
  formatCompactCurrency,
  Currency 
} from '@/utils/currency';
import { cn } from '@/lib/utils';

interface PortfolioValueCardProps {
  portfolioName: string;
  totalValue: number; // Always in USD base
  dayChange: number; // In USD
  dayChangePercent: number;
  totalReturn: number; // In USD
  totalReturnPercent: number;
  holdings: number;
  lastUpdated: string;
  className?: string;
}

export function PortfolioValueCard({
  portfolioName,
  totalValue,
  dayChange,
  dayChangePercent,
  totalReturn,
  totalReturnPercent,
  holdings,
  lastUpdated,
  className,
}: PortfolioValueCardProps) {
  const { currency, toggleCurrency } = useCurrencyPreference();

  // Convert values based on selected currency
  const displayValues = useMemo(() => {
    const isThb = currency === 'THB';
    return {
      totalValue: isThb ? convertCurrency(totalValue, 'USD', 'THB') : totalValue,
      dayChange: isThb ? convertCurrency(dayChange, 'USD', 'THB') : dayChange,
      totalReturn: isThb ? convertCurrency(totalReturn, 'USD', 'THB') : totalReturn,
    };
  }, [currency, totalValue, dayChange, totalReturn]);

  // Determine colors based on values
  const dayChangeColor = dayChange >= 0 ? 'text-green-600' : 'text-red-600';
  const totalReturnColor = totalReturn >= 0 ? 'text-green-600' : 'text-red-600';

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">{portfolioName}</CardTitle>
            <CardDescription>
              {holdings} holdings · Updated {new Date(lastUpdated).toLocaleTimeString()}
            </CardDescription>
          </div>
          <CurrencyToggle
            currency={currency}
            onCurrencyChange={toggleCurrency}
            variant="button"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Portfolio Value */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Value</span>
            <CurrencyDisplay currency={currency} />
          </div>
          <div className="text-4xl font-bold">
            {formatCurrency(displayValues.totalValue, currency)}
          </div>
          {currency === 'THB' && (
            <div className="text-xs text-muted-foreground">
              ≈ {formatCurrency(totalValue, 'USD')} USD
            </div>
          )}
        </div>

        {/* Day Change */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Day Change</span>
            </div>
            <div className={cn('text-xl font-semibold', dayChangeColor)}>
              {formatCurrency(displayValues.dayChange, currency, { showSign: true })}
            </div>
            <div className={cn('flex items-center text-sm', dayChangeColor)}>
              {dayChange >= 0 ? (
                <ArrowUpRight className="h-3 w-3 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 mr-1" />
              )}
              {formatPercent(Math.abs(dayChangePercent))}
            </div>
          </div>

          {/* Total Return */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Return</span>
            </div>
            <div className={cn('text-xl font-semibold', totalReturnColor)}>
              {formatCurrency(displayValues.totalReturn, currency, { showSign: true })}
            </div>
            <div className={cn('flex items-center text-sm', totalReturnColor)}>
              {totalReturn >= 0 ? (
                <ArrowUpRight className="h-3 w-3 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 mr-1" />
              )}
              {formatPercent(Math.abs(totalReturnPercent))}
            </div>
          </div>
        </div>

        {/* Progress Bar showing return */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Performance</span>
            <span className={totalReturnColor}>
              {totalReturnPercent >= 0 ? '+' : ''}{totalReturnPercent.toFixed(2)}%
            </span>
          </div>
          <Progress 
            value={Math.min(Math.abs(totalReturnPercent), 100)} 
            className={cn(
              'h-2',
              totalReturn >= 0 ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'
            )}
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Holdings</div>
            <div className="font-semibold">{holdings}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Avg Daily</div>
            <div className={cn('font-semibold', dayChangeColor)}>
              {formatCompactCurrency(displayValues.dayChange / 30, currency)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Currency</div>
            <Badge variant="secondary" className="mt-1">
              {currency}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Example usage component
export function PortfolioValueExample() {
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold mb-4">Portfolio Value Examples</h2>
      
      {/* Example with positive returns */}
      <PortfolioValueCard
        portfolioName="Growth Portfolio"
        totalValue={50000} // $50,000 USD
        dayChange={1250} // +$1,250
        dayChangePercent={2.56}
        totalReturn={8500} // +$8,500
        totalReturnPercent={20.48}
        holdings={12}
        lastUpdated={new Date().toISOString()}
      />

      {/* Example with negative returns */}
      <PortfolioValueCard
        portfolioName="Conservative Portfolio"
        totalValue={25000} // $25,000 USD
        dayChange={-350} // -$350
        dayChangePercent={-1.38}
        totalReturn={-1200} // -$1,200
        totalReturnPercent={-4.58}
        holdings={8}
        lastUpdated={new Date().toISOString()}
      />

      {/* Example with Thai stocks */}
      <PortfolioValueCard
        portfolioName="Thai Equity Portfolio"
        totalValue={100000} // $100,000 USD (3,550,000 THB)
        dayChange={2500} // +$2,500 (88,750 THB)
        dayChangePercent={2.56}
        totalReturn={15000} // +$15,000 (532,500 THB)
        totalReturnPercent={17.65}
        holdings={25}
        lastUpdated={new Date().toISOString()}
      />
    </div>
  );
}