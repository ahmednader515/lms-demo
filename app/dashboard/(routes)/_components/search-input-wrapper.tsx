"use client";

import { Suspense } from "react";
import { SearchInput } from "./search-input";

export const SearchInputWrapper = () => {
  return (
    <Suspense fallback={
      <div className="flex items-center gap-x-2">
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-10 w-10 animate-pulse rounded-md bg-muted" />
      </div>
    }>
      <SearchInput />
    </Suspense>
  );
}; 