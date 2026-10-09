export interface Book {
  bookId: string;
  title: string;
  author: string;
  category: string;
  status: '대출가능' | '대출중' | string;
  coverUrl: string;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  reservationId?: string;
}

export interface ReservationPayload {
  bookId: string;
  name: string;
  email: string;
  startDate: string;
  endDate: string;
}

export interface ReservationFormValues {
  name: string;
  email: string;
  startDate: string;
  endDate: string;
}

export interface ReservationRecord {
  reservationId: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookCover: string;
  bookCategory: string;
  name: string;
  email: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}
