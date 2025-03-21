// src/ReportConfig.ts
export interface ReportConfig {
  columns: {
    field: string;
    header: string;
    format?: (value: any) => string;
  }[];
  filters: {
    dateRange?: boolean;
    userSelection?: boolean;
  };
}
