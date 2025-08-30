export interface SavingsRecord {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  saved: boolean;
  created_at?: string;
}

export interface Database {
  public: {
    Tables: {
      savings: {
        Row: SavingsRecord;
        Insert: Omit<SavingsRecord, 'id' | 'created_at'>;
        Update: Partial<Omit<SavingsRecord, 'id' | 'created_at' | 'user_id'>>;
      };
    };
  };
}
