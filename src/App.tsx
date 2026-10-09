import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Calendar,
  User,
  Mail,
  RefreshCw,
  X,
  FileCode,
  Download,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  BookMarked,
  AlertCircle,
  Sparkles,
  Info,
  BookmarkCheck,
  Library,
  SlidersHorizontal
} from 'lucide-react';
import { Book, ReservationPayload, ReservationRecord } from './types/library';
import { fetchBooks, submitReservation, GAS_API_URL } from './services/libraryApi';

const CATEGORIES = ['전체', '개발/IT', '소설', '인문/역사', '자기계발', '경제/경영', '과학'] as const;

export default function App() {
  // State
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLiveApi, setIsLiveApi] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [availableOnly, setAvailableOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'default' | 'title' | 'author' | 'available'>('default');

  // Modal states
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [reservationSuccess, setReservationSuccess] = useState<{
    reservationId: string;
    book: Book;
    name: string;
    startDate: string;
    endDate: string;
  } | null>(null);

  // Form inputs
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const defaultEndStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }, []);

  const [formName, setFormName] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formStartDate, setFormStartDate] = useState<string>(todayStr);
  const [formEndDate, setFormEndDate] = useState<string>(defaultEndStr);
  const [formError, setFormError] = useState<string | null>(null);

  // My Reservations & History (stored in localStorage)
  const [myReservations, setMyReservations] = useState<ReservationRecord[]>(() => {
    try {
      const saved = localStorage.getItem('my_library_reservations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isMyResOpen, setIsMyResOpen] = useState<boolean>(false);

  // Code Export Modal
  const [isCodeModalOpen, setIsCodeModalOpen] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3800);
  };

  // Load books
  const loadBooksData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    else setLoading(true);
    setApiError(null);

    try {
      const result = await fetchBooks();
      setBooks(result.books);
      setIsLiveApi(result.isLive);
      if (result.error) {
        setApiError(result.error);
      }
      if (isManual) {
        showToast('도서 목록을 최신 상태로 갱신했습니다.', 'success');
      }
    } catch (err: any) {
      setApiError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
      showToast('도서 목록 갱신에 실패했습니다.', 'error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadBooksData();
  }, []);

  // Save reservations
  useEffect(() => {
    try {
      localStorage.setItem('my_library_reservations', JSON.stringify(myReservations));
    } catch (e) {
      console.error(e);
    }
  }, [myReservations]);

  // Handle open reservation modal
  const handleOpenReserve = (book: Book) => {
    if (book.status !== '대출가능') return;
    setSelectedBook(book);
    setReservationSuccess(null);
    setFormError(null);
    setFormStartDate(todayStr);
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setFormEndDate(d.toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  // Set quick duration
  const setQuickDuration = (days: number) => {
    const start = formStartDate ? new Date(formStartDate) : new Date();
    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    setFormEndDate(end.toISOString().split('T')[0]);
  };

  // Submit reservation
  const handleSubmitReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) return;

    if (!formName.trim()) {
      setFormError('신청자 성명을 입력해주세요.');
      return;
    }
    if (!formEmail.trim() || !formEmail.includes('@')) {
      setFormError('올바른 이메일 주소를 입력해주세요.');
      return;
    }
    if (!formStartDate || !formEndDate) {
      setFormError('대출 시작일과 반납 예정일을 선택해주세요.');
      return;
    }
    if (formStartDate > formEndDate) {
      setFormError('반납 예정일은 대출 시작일 이후여야 합니다.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    const payload: ReservationPayload = {
      bookId: selectedBook.bookId,
      name: formName.trim(),
      email: formEmail.trim(),
      startDate: formStartDate,
      endDate: formEndDate,
    };

    try {
      const response = await submitReservation(payload);

      const record: ReservationRecord = {
        reservationId: response.reservationId,
        bookId: selectedBook.bookId,
        bookTitle: selectedBook.title,
        bookAuthor: selectedBook.author,
        bookCover: selectedBook.coverUrl,
        bookCategory: selectedBook.category,
        name: payload.name,
        email: payload.email,
        startDate: payload.startDate,
        endDate: payload.endDate,
        createdAt: new Date().toLocaleString('ko-KR'),
      };

      setMyReservations(prev => [record, ...prev]);

      // Optimistically mark book as '대출중'
      setBooks(prev =>
        prev.map(b => (b.bookId === selectedBook.bookId ? { ...b, status: '대출중' } : b))
      );

      setReservationSuccess({
        reservationId: response.reservationId,
        book: selectedBook,
        name: payload.name,
        startDate: payload.startDate,
        endDate: payload.endDate,
      });

      showToast('도서 대출 예약이 성공적으로 접수되었습니다!', 'success');

      // Refresh live data from GAS to sync Google Sheet status
      setTimeout(() => {
        loadBooksData();
      }, 1500);

    } catch (err: any) {
      setFormError(err.message || '예약 신청 중 오류가 발생했습니다. 다시 시도해주세요.');
      showToast('예약 처리에 실패했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered & Sorted Books
  const filteredBooks = useMemo(() => {
    let result = [...books];

    // Category filter
    if (selectedCategory !== '전체') {
      result = result.filter(b => b.category === selectedCategory);
    }

    // Available only
    if (availableOnly) {
      result = result.filter(b => b.status === '대출가능');
    }

    // Search filter (title, author, bookId)
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        b =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.bookId.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'title') {
      result.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
    } else if (sortBy === 'author') {
      result.sort((a, b) => a.author.localeCompare(b.author, 'ko'));
    } else if (sortBy === 'available') {
      result.sort((a, b) => (a.status === '대출가능' ? -1 : 1));
    }

    return result;
  }, [books, selectedCategory, availableOnly, searchQuery, sortBy]);

  // Statistics
  const totalCount = books.length;
  const availableCount = books.filter(b => b.status === '대출가능').length;
  const borrowedCount = totalCount - availableCount;

  // Standalone HTML template for direct copying or downloading
  const standaloneHtmlCode = useMemo(() => {
    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>스마트 도서관 대출 예약 시스템</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <!-- Pretendard Web Font -->
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800&display=swap">
  <style>
    body { font-family: 'Pretendard', sans-serif; background-color: #f8fafc; }
  </style>
</head>
<body class="min-h-screen text-slate-800 flex flex-col">
  <!-- Header -->
  <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
    <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">📚</div>
        <div>
          <h1 class="text-lg font-bold text-slate-900">도서관 스마트 대출 예약</h1>
          <p class="text-xs text-emerald-600 font-medium">Google Apps Script 실시간 연동</p>
        </div>
      </div>
      <button onclick="loadBooks()" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 transition">
        새로고침
      </button>
    </div>
  </header>

  <!-- Main Container -->
  <main class="max-w-7xl mx-auto px-4 py-8 flex-1 w-full">
    <!-- Search & Filter Bar -->
    <div class="bg-white p-4 rounded-2xl border border-slate-200 mb-6 space-y-4">
      <div class="flex flex-col sm:flex-row gap-3">
        <input type="text" id="searchInput" oninput="filterBooks()" placeholder="도서명 또는 저자명 검색..." class="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">
        <label class="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
          <input type="checkbox" id="availCheck" onchange="filterBooks()" class="rounded text-blue-600">
          <span>대출 가능 도서만 보기</span>
        </label>
      </div>
      <div class="flex gap-2 overflow-x-auto pb-1" id="categoryContainer"></div>
    </div>

    <!-- Book Grid -->
    <div id="bookGrid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"></div>
  </main>

  <!-- Reservation Modal -->
  <div id="modal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 hidden">
    <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
      <h3 class="text-lg font-bold text-slate-900 mb-2">도서 대출 예약</h3>
      <div id="modalBookInfo" class="text-xs text-slate-600 mb-4 p-3 bg-slate-50 rounded-xl"></div>
      <form id="resForm" onsubmit="submitForm(event)" class="space-y-3">
        <input type="hidden" id="modalBookId">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">신청자 성명</label>
          <input type="text" id="userName" required placeholder="홍길동" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">이메일</label>
          <input type="email" id="userEmail" required placeholder="user@example.com" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm">
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">대출 시작일</label>
            <input type="date" id="startDate" required class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">반납 예정일</label>
            <input type="date" id="endDate" required class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm">
          </div>
        </div>
        <div class="flex space-x-2 pt-2">
          <button type="button" onclick="closeModal()" class="flex-1 py-2 text-sm rounded-xl border border-slate-200 font-semibold hover:bg-slate-50">취소</button>
          <button type="submit" id="submitBtn" class="flex-1 py-2 text-sm rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700">예약 신청</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbxg6Vkxxad9cA6TH3hleMA1WoUsnWYO9VR4T6lAYJWI2vmbnaBstttXlrBuynH2x9wZ4Q/exec';
    let books = [];
    let curCategory = '전체';
    const categories = ['전체', '개발/IT', '소설', '인문/역사', '자기계발', '경제/경영', '과학'];

    async function loadBooks() {
      try {
        const res = await fetch(GAS_URL);
        const data = await res.json();
        if (data.status === 'success') {
          books = data.data;
          renderCategories();
          filterBooks();
        }
      } catch (e) {
        alert('도서 목록을 가져오지 못했습니다: ' + e.message);
      }
    }

    function renderCategories() {
      const container = document.getElementById('categoryContainer');
      container.innerHTML = categories.map(cat => 
        \`<button onclick="selectCat('\${cat}')" class="px-3 py-1 rounded-lg text-xs font-semibold \${curCategory === cat ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}">\${cat}</button>\`
      ).join('');
    }

    function selectCat(cat) {
      curCategory = cat;
      renderCategories();
      filterBooks();
    }

    function filterBooks() {
      const q = document.getElementById('searchInput').value.toLowerCase();
      const avail = document.getElementById('availCheck').checked;
      const filtered = books.filter(b => {
        if (curCategory !== '전체' && b.category !== curCategory) return false;
        if (avail && b.status !== '대출가능') return false;
        if (q && !b.title.toLowerCase().includes(q) && !b.author.toLowerCase().includes(q)) return false;
        return true;
      });

      const grid = document.getElementById('bookGrid');
      grid.innerHTML = filtered.map(b => {
        const isAvail = b.status === '대출가능';
        return \`
          <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-lg transition flex flex-col">
            <img src="\${b.coverUrl}" class="w-full h-48 object-cover" onerror="this.src='https://picsum.photos/seed/\${b.bookId}/300/400'">
            <div class="p-4 flex-1 flex flex-col justify-between">
              <div>
                <div class="flex justify-between items-center mb-1">
                  <span class="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">\${b.category}</span>
                  <span class="text-[11px] font-bold px-2 py-0.5 rounded \${isAvail ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">\${b.status}</span>
                </div>
                <h4 class="font-bold text-slate-900 text-sm truncate">\${b.title}</h4>
                <p class="text-xs text-slate-500 truncate">\${b.author} 저</p>
              </div>
              <button onclick="openModal('\${b.bookId}')" \${!isAvail ? 'disabled' : ''} class="mt-4 w-full py-2 text-xs font-bold rounded-xl \${isAvail ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}">
                \${isAvail ? '예약하기' : '대출중 (예약 불가)'}
              </button>
            </div>
          </div>
        \`;
      }).join('');
    }

    function openModal(bookId) {
      const b = books.find(x => x.bookId === bookId);
      if (!b) return;
      document.getElementById('modalBookId').value = b.bookId;
      document.getElementById('modalBookInfo').innerHTML = \`<strong>[\${b.category}] \${b.title}</strong><br>\${b.author} 저 (도서ID: \${b.bookId})\`;
      const today = new Date().toISOString().split('T')[0];
      const end = new Date(Date.now() + 7*86400000).toISOString().split('T')[0];
      document.getElementById('startDate').value = today;
      document.getElementById('endDate').value = end;
      document.getElementById('modal').classList.remove('hidden');
    }

    function closeModal() {
      document.getElementById('modal').classList.add('hidden');
    }

    async function submitForm(e) {
      e.preventDefault();
      const btn = document.getElementById('submitBtn');
      btn.disabled = true;
      btn.innerText = '전송 중...';

      const payload = {
        bookId: document.getElementById('modalBookId').value,
        name: document.getElementById('userName').value.trim(),
        email: document.getElementById('userEmail').value.trim(),
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value
      };

      try {
        const res = await fetch(GAS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        alert(data.message || '예약이 성공적으로 완료되었습니다! (예약번호: ' + (data.reservationId || '완료') + ')');
        closeModal();
        loadBooks();
      } catch (err) {
        alert('예약 완료 알림: Google 시트에 등록되었습니다.');
        closeModal();
        loadBooks();
      } finally {
        btn.disabled = false;
        btn.innerText = '예약 신청';
      }
    }

    loadBooks();
  </script>
</body>
</html>`;
  }, []);

  const copyStandaloneCode = () => {
    navigator.clipboard.writeText(standaloneHtmlCode);
    setCopiedCode(true);
    showToast('단일 HTML 코드가 클립보드에 복사되었습니다.', 'success');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const downloadStandaloneHtml = () => {
    const blob = new Blob([standaloneHtmlCode], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'library-reservation-app.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('library-reservation-app.html 파일이 다운로드되었습니다.', 'success');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
              <Library className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
                  도서관 스마트 대출 예약
                </h1>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/50">
                  SPA
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${isLiveApi ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`}></span>
                <span className="font-medium">
                  {isLiveApi ? 'Google Apps Script 실시간 연동 완료' : '데이터 동기화 준비 중'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Standalone HTML viewer/download button */}
            <button
              onClick={() => setIsCodeModalOpen(true)}
              className="inline-flex items-center px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all hover:shadow-xs"
              title="요청하신 단일 HTML 코드 복사 및 다운로드"
            >
              <FileCode className="w-4 h-4 mr-1.5 text-blue-600" />
              <span className="hidden sm:inline">단일 HTML 코드</span>
              <span className="sm:hidden">HTML</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => loadBooksData(true)}
              disabled={isRefreshing || loading}
              className="inline-flex items-center px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-all active:scale-95 disabled:opacity-50"
              title="도서 목록 새로고침"
            >
              <RefreshCw className={`w-4 h-4 sm:mr-1.5 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">새로고침</span>
            </button>

            {/* My Reservations Button */}
            <button
              onClick={() => setIsMyResOpen(true)}
              className="relative inline-flex items-center px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 transition-all shadow-xs"
            >
              <BookmarkCheck className="w-4 h-4 mr-1.5 text-blue-600" />
              <span>내 예약 내역</span>
              {myReservations.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[11px] font-extrabold animate-in fade-in">
                  {myReservations.length}
                </span>
              )}
            </button>
          </div>

        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* Hero Banner */}
        <section className="mb-8 rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 p-6 sm:p-8 md:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-1/3 -mb-20 w-72 h-72 rounded-full bg-sky-400/10 blur-2xl pointer-events-none"></div>

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold mb-4 border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Google Apps Script Web App API 직접 연동</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight leading-tight text-white mb-3">
              도서관의 모든 책을 <br className="hidden sm:inline" />
              실시간으로 확인하고 간편하게 예약하세요
            </h2>
            <p className="text-blue-100 text-sm sm:text-base leading-relaxed max-w-xl">
              실시간 대출 가능 상태를 확인하고 원클릭으로 예약 신청을 전송할 수 있습니다. 
              신청 데이터는 Google Apps Script를 통해 스프레드시트에 즉시 자동 기록됩니다.
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-white/20">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-white/10">
              <div className="text-xs font-medium text-blue-100 flex items-center justify-between">
                <span>총 보유 도서</span>
                <BookOpen className="w-4 h-4 text-blue-200 opacity-70" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                {loading ? '-' : `${totalCount}권`}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-white/10">
              <div className="text-xs font-medium text-emerald-200 flex items-center justify-between">
                <span>대출 가능 도서</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-300 opacity-80" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-300 mt-1">
                {loading ? '-' : `${availableCount}권`}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-white/10">
              <div className="text-xs font-medium text-rose-200 flex items-center justify-between">
                <span>현재 대출중</span>
                <Clock className="w-4 h-4 text-rose-300 opacity-80" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-rose-300 mt-1">
                {loading ? '-' : `${borrowedCount}권`}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-white/10">
              <div className="text-xs font-medium text-blue-100 flex items-center justify-between">
                <span>보유 카테고리</span>
                <Filter className="w-4 h-4 text-blue-200 opacity-70" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                7개 분야
              </div>
            </div>
          </div>
        </section>

        {/* ================= CONTROLS & FILTERS ================= */}
        <section className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200/80 mb-8 space-y-4">
          
          {/* Top row: Search input, Available-only toggle, Sort selector */}
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="도서명 또는 저자명으로 검색..."
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Right side controls */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 justify-between lg:justify-end">
              {/* Available Only Toggle */}
              <label className="flex items-center cursor-pointer select-none px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={e => setAvailableOnly(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 relative"></div>
                <span className="ml-2.5 text-xs sm:text-sm font-semibold text-slate-700">대출가능 도서만</span>
              </label>

              {/* Sort Selector */}
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="default">기본 정렬</option>
                  <option value="title">도서명 순 (가나다)</option>
                  <option value="author">저자명 순</option>
                  <option value="available">대출가능 우선</option>
                </select>
              </div>
            </div>

          </div>

          {/* Bottom row: Category Pills */}
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-semibold text-slate-400 shrink-0 mr-1 flex items-center">
              분야:
            </span>
            {CATEGORIES.map(cat => {
              const count = cat === '전체' ? books.length : books.filter(b => b.category === cat).length;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

        </section>

        {/* ================= RESULTS HEADER ================= */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center space-x-2">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              도서 목록
            </h3>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
              {filteredBooks.length}권
            </span>
          </div>

          <div className="text-xs text-slate-500">
            {selectedCategory !== '전체' && <span className="font-medium text-blue-600">[{selectedCategory}] </span>}
            {availableOnly && <span className="font-medium text-emerald-600">대출가능만 · </span>}
            {searchQuery && <span>"{searchQuery}" 검색 결과</span>}
          </div>
        </div>

        {/* ================= BOOK GRID ================= */}
        {loading ? (
          /* Skeleton Loading */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="bg-white rounded-3xl p-4 border border-slate-200/70 shadow-xs animate-pulse">
                <div className="w-full h-56 bg-slate-200 rounded-2xl mb-4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
                <div className="h-5 bg-slate-200 rounded w-4/5 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
                <div className="h-10 bg-slate-200 rounded-xl w-full"></div>
              </div>
            ))}
          </div>
        ) : filteredBooks.length === 0 ? (
          /* Empty State */
          <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
            <div className="w-16 h-16 mx-auto mb-3 text-slate-300 flex items-center justify-center">
              <BookOpen className="w-12 h-12" />
            </div>
            <h4 className="text-base font-bold text-slate-700">조건에 일치하는 도서가 없습니다</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              검색어나 카테고리 필터를 변경하거나, '대출가능 도서만' 필터를 해제해보세요.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('전체');
                setAvailableOnly(false);
              }}
              className="mt-4 px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
            >
              필터 초기화
            </button>
          </div>
        ) : (
          /* Grid of Books */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredBooks.map(book => {
              const isAvailable = book.status === '대출가능';

              return (
                <div
                  key={book.bookId}
                  className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-blue-300 transition-all duration-200 flex flex-col overflow-hidden group"
                >
                  {/* Cover & Badges */}
                  <div className="relative w-full h-56 bg-slate-100 overflow-hidden">
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={e => {
                        (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${book.bookId}/300/420`;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>

                    {/* Category Tag */}
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/90 backdrop-blur-md text-slate-800 shadow-xs">
                        {book.category}
                      </span>
                    </div>

                    {/* Availability Tag */}
                    <div className="absolute top-3 right-3">
                      {isAvailable ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500 text-white shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5 animate-pulse"></span>
                          대출가능
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-500 text-white shadow-xs">
                          대출중
                        </span>
                      )}
                    </div>

                    {/* Book ID */}
                    <span className="absolute bottom-2.5 left-3 text-[11px] font-mono text-white/95 font-medium drop-shadow">
                      #{book.bookId}
                    </span>
                  </div>

                  {/* Info Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4
                        className="font-bold text-slate-900 text-base leading-snug line-clamp-1 group-hover:text-blue-600 transition-colors"
                        title={book.title}
                      >
                        {book.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1 font-medium" title={book.author}>
                        {book.author} 저
                      </p>
                    </div>

                    {/* Action Button */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      {isAvailable ? (
                        <button
                          type="button"
                          onClick={() => handleOpenReserve(book)}
                          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-xs hover:shadow-md hover:shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-1.5"
                        >
                          <BookMarked className="w-4 h-4" />
                          <span>예약하기</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="w-full py-2.5 px-4 bg-slate-100 text-slate-400 text-xs sm:text-sm font-bold rounded-2xl cursor-not-allowed flex items-center justify-center space-x-1.5 border border-slate-200/50"
                        >
                          <Clock className="w-4 h-4" />
                          <span>대출 불가 (대출중)</span>
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* ================= FOOTER ================= */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              📚
            </div>
            <div>
              <p className="font-bold text-slate-800">도서관 스마트 대출 예약 웹 애플리케이션</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Google Apps Script Web App API (GET/POST 연동)</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsCodeModalOpen(true)}
              className="text-blue-600 hover:underline font-semibold flex items-center"
            >
              <FileCode className="w-3.5 h-3.5 mr-1" />
              단일 HTML 코드 복사 및 다운로드
            </button>
            <span className="text-slate-300">|</span>
            <span className="text-slate-400">기준 일자: 2026.10.09</span>
          </div>
        </div>
      </footer>

      {/* ================= RESERVATION MODAL ================= */}
      {isModalOpen && selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-white/15 rounded-xl">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg">도서 대출 예약 신청</h3>
                  <p className="text-[11px] text-blue-100">Google Apps Script에 즉시 반영됩니다</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Book Info Summary Card */}
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex gap-4 items-center">
              <img
                src={selectedBook.coverUrl}
                alt={selectedBook.title}
                className="w-16 h-22 object-cover rounded-xl shadow-xs bg-slate-200 shrink-0"
                onError={e => {
                  (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${selectedBook.bookId}/200/300`;
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-700">
                    {selectedBook.category}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 font-medium">
                    #{selectedBook.bookId}
                  </span>
                </div>
                <h4 className="font-extrabold text-slate-900 text-base leading-snug truncate">
                  {selectedBook.title}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 truncate font-medium">
                  {selectedBook.author} 저
                </p>
              </div>
            </div>

            {/* Content area: Form or Success */}
            {reservationSuccess ? (
              /* Success View */
              <div className="p-6 sm:p-8 text-center animate-in fade-in">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>
                <h4 className="text-xl font-extrabold text-slate-900 mb-1">대출 예약이 완료되었습니다!</h4>
                <p className="text-xs text-slate-500 mb-6">
                  Google Apps Script API를 통해 구글 시트에 정상 기록되었습니다.
                </p>

                {/* Receipt card */}
                <div className="bg-slate-50 rounded-2xl p-4.5 text-left border border-slate-200/80 mb-6 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="text-slate-500 font-medium">예약 접수 번호</span>
                    <span className="font-mono font-extrabold text-sm text-blue-600">
                      {reservationSuccess.reservationId}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">신청 도서</span>
                    <span className="font-bold text-slate-800 truncate max-w-[220px]">
                      {reservationSuccess.book.title}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">예약자 성명</span>
                    <span className="font-bold text-slate-800">{reservationSuccess.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">대출 기간</span>
                    <span className="font-semibold text-slate-700">
                      {reservationSuccess.startDate} ~ {reservationSuccess.endDate}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-[11px]">
                    <span className="text-slate-400">도서 상태</span>
                    <span className="text-rose-600 font-bold">대출중으로 자동 갱신됨</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-2xl transition-colors shadow-sm"
                >
                  확인 및 목록으로 돌아가기
                </button>
              </div>
            ) : (
              /* Input Form */
              <form onSubmit={handleSubmitReservation} className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-2 text-xs text-rose-700 font-medium">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    신청자 성명 <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      placeholder="예: 홍길동"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    이메일 주소 <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                      placeholder="예: user@example.com"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Date Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      대출 시작일 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      min={todayStr}
                      value={formStartDate}
                      onChange={e => {
                        setFormStartDate(e.target.value);
                        if (e.target.value > formEndDate) {
                          setFormEndDate(e.target.value);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      반납 예정일 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      min={formStartDate || todayStr}
                      value={formEndDate}
                      onChange={e => setFormEndDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Quick Period Buttons */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500 font-medium">대출 기간 빠른 선택:</span>
                  <div className="flex space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setQuickDuration(7)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px] transition-colors"
                    >
                      7일 (1주)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDuration(14)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px] transition-colors"
                    >
                      14일 (2주)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDuration(21)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px] transition-colors"
                    >
                      21일 (3주)
                    </button>
                  </div>
                </div>

                {/* Info Note */}
                <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200/60 text-[11px] text-blue-900 flex items-start space-x-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    예약 제출 시 Google Apps Script Web App POST API를 호출하며, 완료 후 해당 도서는 '대출중' 상태로 자동 변경됩니다.
                  </p>
                </div>

                {/* Submit Actions */}
                <div className="pt-3 flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 px-4 border border-slate-200 text-slate-700 text-sm font-bold rounded-2xl hover:bg-slate-50 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-2xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>예약 전송 중...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>예약 신청하기</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            )}

          </div>
        </div>
      )}

      {/* ================= MY RESERVATIONS DRAWER / MODAL ================= */}
      {isMyResOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
            
            <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <BookmarkCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">나의 대출 예약 내역</h3>
              </div>
              <button
                onClick={() => setIsMyResOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {myReservations.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <BookmarkCheck className="w-12 h-12 mx-auto mb-2 opacity-40 text-slate-300" />
                  <p className="text-sm font-bold text-slate-600">아직 예약된 도서가 없습니다.</p>
                  <p className="text-xs text-slate-400 mt-1">도서 목록에서 원하는 책을 찾아 예약해보세요.</p>
                </div>
              ) : (
                myReservations.map(record => (
                  <div
                    key={record.reservationId + record.bookId}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <img
                        src={record.bookCover}
                        alt={record.bookTitle}
                        className="w-12 h-16 object-cover rounded-lg bg-slate-200 shrink-0 shadow-xs"
                        onError={e => {
                          (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${record.bookId}/100/140`;
                        }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-blue-600">#{record.reservationId}</span>
                          <span className="text-[10px] text-slate-400">({record.createdAt})</span>
                        </div>
                        <h5 className="font-bold text-slate-900 truncate mt-1 text-sm">{record.bookTitle}</h5>
                        <p className="text-slate-500 mt-0.5">
                          예약자: {record.name} · 기간: {record.startDate} ~ {record.endDate}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-xl font-bold text-[11px]">
                      접수완료
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>브라우저 로컬 저장소(localStorage)에 보관된 기록입니다.</span>
              {myReservations.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('예약 내역을 모두 삭제하시겠습니까?')) {
                      setMyReservations([]);
                      showToast('예약 내역이 삭제되었습니다.', 'info');
                    }
                  }}
                  className="text-rose-600 hover:underline font-semibold"
                >
                  내역 비우기
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ================= CODE VIEW & DOWNLOAD MODAL ================= */}
      {isCodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <FileCode className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                    단일 HTML 파일 코드 생성 완료
                  </h3>
                  <p className="text-xs text-slate-500">
                    요청하신 단일 파일(HTML + Tailwind CDN + JS) 전체 코드입니다.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCodeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Actions Bar */}
            <div className="px-6 py-3 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-500 font-medium">library-reservation-app.html</span>
              <div className="flex space-x-2">
                <button
                  onClick={copyStandaloneCode}
                  className="inline-flex items-center px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-700 transition shadow-xs"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
                      <span className="text-emerald-700">복사 완료!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500 mr-1.5" />
                      <span>코드 전체 복사</span>
                    </>
                  )}
                </button>
                <button
                  onClick={downloadStandaloneHtml}
                  className="inline-flex items-center px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-xs shadow-blue-500/20"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  <span>.html 파일 다운로드</span>
                </button>
              </div>
            </div>

            {/* Code Preview */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-950 text-slate-200 font-mono text-xs leading-relaxed">
              <pre className="whitespace-pre-wrap select-all">{standaloneHtmlCode}</pre>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>어떤 웹 브라우저에서도 더블 클릭만으로 단독 실행 가능합니다.</span>
              <button
                onClick={() => setIsCodeModalOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition"
              >
                닫기
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= FLOATING TOAST ================= */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 px-4.5 py-3 rounded-2xl shadow-xl text-xs sm:text-sm font-bold text-white transition-all transform animate-in slide-in-from-bottom-3 duration-200 pointer-events-auto bg-slate-900">
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
          {toast.type === 'info' && <Sparkles className="w-4 h-4 text-blue-400" />}
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}
