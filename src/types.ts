export interface JobApplication {
  id: string;
  company: string;
  role: string;
  dateApplied: string;
  status: 'Applied' | 'Pending' | 'Interviewing' | 'Selected' | 'Rejected' | 'Offer';
  notes: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  imageUrl?: string;
}
