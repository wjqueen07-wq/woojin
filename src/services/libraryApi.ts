import { Book, ApiResponse, ReservationPayload } from '../types/library';

export const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxg6Vkxxad9cA6TH3hleMA1WoUsnWYO9VR4T6lAYJWI2vmbnaBstttXlrBuynH2x9wZ4Q/exec';

// Fallback books in case of network unavailability
export const FALLBACK_BOOKS: Book[] = [
  { bookId: "B001", title: "클린 코드", author: "로버트 C. 마틴", category: "개발/IT", status: "대출가능", coverUrl: "https://picsum.photos/seed/b001/300/420" },
  { bookId: "B002", title: "도커 : 수평 확장을 위한 컨테이너 관리", author: "이시이 히사시", category: "개발/IT", status: "대출가능", coverUrl: "https://picsum.photos/seed/b002/300/420" },
  { bookId: "B003", title: "리팩터링 2판", author: "마틴 파울러", category: "개발/IT", status: "대출가능", coverUrl: "https://picsum.photos/seed/b003/300/420" },
  { bookId: "B004", title: "혼자 공부하는 머신러닝+딥러닝", author: "박해선", category: "개발/IT", status: "대출가능", coverUrl: "https://picsum.photos/seed/b004/300/420" },
  { bookId: "B005", title: "모던 자바스크립트 Deep Dive", author: "이웅모", category: "개발/IT", status: "대출가능", coverUrl: "https://picsum.photos/seed/b005/300/420" },
  { bookId: "B006", title: "불편한 편의점", author: "김호연", category: "소설", status: "대출가능", coverUrl: "https://picsum.photos/seed/b006/300/420" },
  { bookId: "B007", title: "구부러진 마음의 지도", author: "김영하", category: "소설", status: "대출가능", coverUrl: "https://picsum.photos/seed/b007/300/420" },
  { bookId: "B008", title: "아몬드", author: "손원평", category: "소설", status: "대출가능", coverUrl: "https://picsum.photos/seed/b008/300/420" },
  { bookId: "B009", title: "미드나잇 라이브러리", author: "매트 헤이그", category: "소설", status: "대출가능", coverUrl: "https://picsum.photos/seed/b009/300/420" },
  { bookId: "B010", title: "지구 끝의 온실", author: "김초엽", category: "소설", status: "대출가능", coverUrl: "https://picsum.photos/seed/b010/300/420" },
  { bookId: "B011", title: "사피엔스", author: "유발 하라리", category: "인문/역사", status: "대출가능", coverUrl: "https://picsum.photos/seed/b011/300/420" },
  { bookId: "B012", title: "총 균 쇠", author: "재레드 다이아몬드", category: "인문/역사", status: "대출가능", coverUrl: "https://picsum.photos/seed/b012/300/420" },
  { bookId: "B013", title: "데일 카네기 인간관계론", author: "데일 카네기", category: "자기계발", status: "대출가능", coverUrl: "https://picsum.photos/seed/b013/300/420" },
  { bookId: "B014", title: "아주 작은 습관의 힘", author: "제임스 클리어", category: "자기계발", status: "대출가능", coverUrl: "https://picsum.photos/seed/b014/300/420" },
  { bookId: "B015", title: "원씽 (The One Thing)", author: "게리 켈러", category: "자기계발", status: "대출가능", coverUrl: "https://picsum.photos/seed/b015/300/420" },
  { bookId: "B016", title: "트렌드 코리아 2026", author: "김난도 외", category: "경제/경영", status: "대출가능", coverUrl: "https://picsum.photos/seed/b016/300/420" },
  { bookId: "B017", title: "돈의 속성", author: "김승호", category: "경제/경영", status: "대출가능", coverUrl: "https://picsum.photos/seed/b017/300/420" },
  { bookId: "B018", title: "코스모스", author: "칼 세이건", category: "과학", status: "대출가능", coverUrl: "https://picsum.photos/seed/b018/300/420" },
  { bookId: "B019", title: "침묵의 봄", author: "레이첼 카슨", category: "과학", status: "대출가능", coverUrl: "https://picsum.photos/seed/b019/300/420" },
  { bookId: "B020", title: "물고기는 존재하지 않는다", author: "룰루 밀러", category: "과학", status: "대출가능", coverUrl: "https://picsum.photos/seed/b020/300/420" }
];

export async function fetchBooks(): Promise<{ books: Book[]; isLive: boolean; error?: string }> {
  try {
    const res = await fetch(GAS_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }

    const data: ApiResponse<Book[]> = await res.json();
    if (data.status === 'success' && Array.isArray(data.data)) {
      return { books: data.data, isLive: true };
    }

    throw new Error(data.message || '도서 데이터를 불러올 수 없습니다.');
  } catch (err: any) {
    console.warn('GAS GET Error, using fallback data:', err);
    return {
      books: FALLBACK_BOOKS,
      isLive: false,
      error: err.message || '네트워크 연결 실패로 기본 데이터를 표시합니다.',
    };
  }
}

export async function submitReservation(payload: {
  bookId: string;
  name: string;
  email: string;
  startDate: string;
  endDate: string;
}): Promise<{ success: boolean; message: string; reservationId: string }> {
  try {
    // We send as text/plain to avoid CORS preflight failures on Google Apps Script Web App
    const res = await fetch(GAS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    // If redirected to script.googleusercontent.com, fetch automatically follows
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      // If response body is not JSON but status is ok
      if (res.ok) {
        return {
          success: true,
          message: '예약이 성공적으로 완료되었습니다.',
          reservationId: 'R-' + Date.now().toString().slice(-5),
        };
      }
      throw new Error('응답을 파싱할 수 없습니다.');
    }

    if (data.status === 'success' || data.reservationId) {
      return {
        success: true,
        message: data.message || '예약이 성공적으로 접수되었습니다.',
        reservationId: data.reservationId || ('R-' + Date.now().toString().slice(-5)),
      };
    } else {
      throw new Error(data.message || '예약 처리에 실패했습니다.');
    }
  } catch (err: any) {
    // If browser threw a CORS error during redirect, we can still provide a reservation id fallback
    console.error('Reservation submit error:', err);
    // Provide detailed error but ensure user knows
    throw new Error(err.message || 'Google Apps Script 서버 통신 중 오류가 발생했습니다.');
  }
}
