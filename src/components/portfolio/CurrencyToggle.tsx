/**
 * Currency toggle component for switching between THB and USD
 */

"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Currency, getCurrencySymbol, CURRENCIES } from '@/utils/currency';
import { DollarSign, Globe, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CurrencyToggleProps {
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  autoDetect?: boolean;
  onAutoDetectChange?: (enabled: boolean) => void;
  variant?: 'button' | 'dropdown' | 'switch';
  className?: string;
}

export function CurrencyToggle({
  currency,
  onCurrencyChange,
  autoDetect = false,
  onAutoDetectChange,
  variant = 'dropdown',
  className,
}: CurrencyToggleProps) {
  // Simple toggle button between THB and USD
  if (variant === 'button') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => onCurrencyChange(currency === 'THB' ? 'USD' : 'THB')}
        className={cn('min-w-[80px]', className)}
      >
        <span className="font-semibold text-lg mr-1">
          {getCurrencySymbol(currency)}
        </span>
        <span className="text-xs">{currency}</span>
      </Button>
    );
  }

  // Switch style toggle
  if (variant === 'switch') {
    return (
      <div className={cn('flex items-center space-x-3', className)}>
        <span className={cn(
          'text-sm font-medium',
          currency === 'USD' ? 'text-primary' : 'text-muted-foreground'
        )}>
          $ USD
        </span>
        <Switch
          checked={currency === 'THB'}
          onCheckedChange={(checked) => onCurrencyChange(checked ? 'THB' : 'USD')}
        />
        <span className={cn(
          'text-sm font-medium',
          currency === 'THB' ? 'text-primary' : 'text-muted-foreground'
        )}>
          ฿ THB
        </span>
      </div>
    );
  }

  // Dropdown menu with options
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('min-w-[120px] justify-between', className)}
        >
          <div className="flex items-center">
            <span className="font-semibold text-lg mr-2">
              {getCurrencySymbol(currency)}
            </span>
            <span className="text-sm">{CURRENCIES[currency].name}</span>
          </div>
          <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Select Currency</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Currency Options */}
        <DropdownMenuItem
          onClick={() => onCurrencyChange('THB')}
          className="cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <span className="font-semibold text-lg mr-2">฿</span>
              <span>Thai Baht (THB)</span>
            </div>
            {currency === 'THB' && (
              <span className="text-primary">✓</span>
            )}
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => onCurrencyChange('USD')}
          className="cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <span className="font-semibold text-lg mr-2">$</span>
              <span>US Dollar (USD)</span>
            </div>
            {currency === 'USD' && (
              <span className="text-primary">✓</span>
            )}
          </div>
        </DropdownMenuItem>

        {/* Auto-detect option */}
        {onAutoDetectChange && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-detect"
                  checked={autoDetect}
                  onCheckedChange={onAutoDetectChange}
                />
                <Label
                  htmlFor="auto-detect"
                  className="text-sm cursor-pointer flex items-center"
                >
                  <Globe className="h-3 w-3 mr-1" />
                  Auto-detect
                </Label>
              </div>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Compact currency display component
export function CurrencyDisplay({
  currency,
  className,
}: {
  currency: Currency;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center', className)}>
      <span className="font-semibold text-lg">
        {getCurrencySymbol(currency)}
      </span>
      <span className="text-xs text-muted-foreground ml-1">
        {currency}
      </span>
    </div>
  );
}

// Currency badge component
export function CurrencyBadge({
  currency,
  className,
}: {
  currency: Currency;
  className?: string;
}) {
  return (
    <div className={cn(
      'inline-flex items-center px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-medium',
      className
    )}>
      <span className="font-bold mr-1">
        {getCurrencySymbol(currency)}
      </span>
      <span>{currency}</span>
    </div>
  );
}