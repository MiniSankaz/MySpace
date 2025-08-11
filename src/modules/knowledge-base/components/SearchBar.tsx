'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchBarProps {
  onSearch: (params: SearchParams) => void;
  categories?: Array<{ id: string; name: string }>;
  tags?: Array<{ id: string; name: string }>;
  users?: Array<{ id: string; displayName?: string; email: string }>;
}

interface SearchParams {
  query?: string;
  status?: string;
  severity?: string;
  categoryId?: string;
  assignedTo?: string;
  tags?: string[];
}

export function SearchBar({ onSearch, categories = [], tags = [], users = [] }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchParams>({});
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    handleSearch();
  }, [debouncedQuery]);

  const handleSearch = useCallback(() => {
    onSearch({
      query: debouncedQuery,
      ...filters,
      tags: selectedTags.length > 0 ? selectedTags : undefined
    });
  }, [debouncedQuery, filters, selectedTags, onSearch]);

  const updateFilter = (key: keyof SearchParams, value: string | undefined) => {
    const newFilters = { ...filters };
    if (value) {
      newFilters[key] = value;
    } else {
      delete newFilters[key];
    }
    setFilters(newFilters);
    handleSearch();
  };

  const toggleTag = (tagName: string) => {
    const newTags = selectedTags.includes(tagName)
      ? selectedTags.filter(t => t !== tagName)
      : [...selectedTags, tagName];
    setSelectedTags(newTags);
  };

  const clearFilters = () => {
    setFilters({});
    setSelectedTags([]);
    setQuery('');
    onSearch({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0 || selectedTags.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search issues, errors, or solutions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  options={[
                    { value: 'all', label: 'All statuses' },
                    { value: 'open', label: 'Open' },
                    { value: 'in_progress', label: 'In Progress' },
                    { value: 'resolved', label: 'Resolved' },
                    { value: 'closed', label: 'Closed' },
                    { value: 'reopened', label: 'Reopened' }
                  ]}
                  value={filters.status || 'all'}
                  onChange={(value) => updateFilter('status', value === 'all' ? undefined : value as string)}
                  placeholder="All statuses"
                />
              </div>

              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  options={[
                    { value: 'all', label: 'All severities' },
                    { value: 'critical', label: 'Critical' },
                    { value: 'high', label: 'High' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'low', label: 'Low' },
                    { value: 'info', label: 'Info' }
                  ]}
                  value={filters.severity || 'all'}
                  onChange={(value) => updateFilter('severity', value === 'all' ? undefined : value as string)}
                  placeholder="All severities"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={clearFilters}
              >
                <X className="w-3 h-3 mr-2" />
                Clear filters
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.status && (
            <Badge variant="secondary">
              Status: {filters.status}
              <X 
                className="w-3 h-3 ml-1 cursor-pointer" 
                onClick={() => updateFilter('status', undefined)}
              />
            </Badge>
          )}
          {filters.severity && (
            <Badge variant="secondary">
              Severity: {filters.severity}
              <X 
                className="w-3 h-3 ml-1 cursor-pointer" 
                onClick={() => updateFilter('severity', undefined)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}