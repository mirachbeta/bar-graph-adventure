/* ==========================================
   우당탕탕 막대그래프 대모험 - 핵심 로직 JS (최종본)
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
  
  // 1차시만 우선 배포하는 전용 플래그
  const ONLY_SESSION_1 = true;
  
  // ==========================================
  // A. 상태 관리 객체 (State Management)
  // ==========================================
  const state = {
    studentName: '',
    currentStep: 0,       // 현재 단계 (0~6)
    unlockedStep: 1,      // 열린 최고 단계 (1~6)
    drawingData: {
      mon: 0,
      tue: 0,
      wed: 0,
      thu: 0,
      fri: 0
    },
    customGraph: {
      title: '우리 반 친구들이 좋아하는 운동',
      unit: '명',
      items: [
        { name: '축구 ⚽', val: 8 },
        { name: '피구 🏐', val: 6 },
        { name: '줄넘기 🏃', val: 4 },
        { name: '야구 ⚾', val: 5 }
      ]
    },
    reviews: [] // 모둠 평가 리스트: { reviewerName: '', comment: '', isCorrect: true }
  };

  // 정답 테이블
  const TARGET_DRAWING = {
    mon: 15,
    tue: 25,
    wed: 5,
    thu: 30,
    fri: 20
  };

  // TTS 현재 합성 객체 및 목소리 목록 캐싱
  let currentUtterance = null;
  let voices = [];

  function populateVoices() {
    voices = window.speechSynthesis.getVoices();
  }
  populateVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = populateVoices;
  }

  // ==========================================
  // B. 로컬 스토리지 로드 및 세션 유지
  // ==========================================
  function loadProgress() {
    const savedName = localStorage.getItem('barGraph_studentName');
    const savedUnlocked = localStorage.getItem('barGraph_unlockedStep');
    const savedCustom = localStorage.getItem('barGraph_customGraph');
    const savedReviews = localStorage.getItem('barGraph_reviews');

    if (savedName) {
      state.studentName = savedName;
      document.getElementById('student-name-display').textContent = `${savedName} 탐험가`;
      document.getElementById('cert-name-label').textContent = savedName;
      
      state.unlockedStep = parseInt(savedUnlocked || '1', 10);
      if (ONLY_SESSION_1) {
        state.unlockedStep = 1;
      }
      state.currentStep = state.unlockedStep;
      
      showPanel(state.currentStep);
      updateNavigationUI();
    } else {
      state.currentStep = 0;
      showPanel(0);
    }

    if (savedCustom) {
      state.customGraph = JSON.parse(savedCustom);
    }
    if (savedReviews) {
      state.reviews = JSON.parse(savedReviews);
      renderReviewersChips();
    }
  }

  // ==========================================
  // C. TTS(Text-to-Speech) 음성 읽어주기 로직
  // ==========================================
  function speakText(text, btnElement) {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      if (btnElement && btnElement.classList.contains('speaking')) {
        btnElement.classList.remove('speaking');
        return;
      }
    }

    document.querySelectorAll('.btn-tts').forEach(b => b.classList.remove('speaking'));

    if (!text) return;

    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.lang = 'ko-KR';
    currentUtterance.rate = 0.95; // 살짝 천천히 읽기

    // 한국어 목소리 필터링
    const koVoices = voices.filter(v => v.lang === 'ko-KR' || v.lang.startsWith('ko'));
    
    // 고품질 자연어/온라인 목소리 우선 순위 검색 (Microsoft Natural 혹은 Google 한국어)
    let bestVoice = koVoices.find(v => v.name.includes('Natural') || v.name.includes('Online'));
    if (!bestVoice) {
      bestVoice = koVoices.find(v => v.name.includes('Google'));
    }
    if (!bestVoice && koVoices.length > 0) {
      bestVoice = koVoices[0]; // 없으면 기본 한국어 목소리 지정
    }
    
    if (bestVoice) {
      currentUtterance.voice = bestVoice;
    }

    if (btnElement) {
      btnElement.classList.add('speaking');
    }

    currentUtterance.onend = () => {
      if (btnElement) {
        btnElement.classList.remove('speaking');
      }
    };

    currentUtterance.onerror = () => {
      if (btnElement) {
        btnElement.classList.remove('speaking');
      }
    };

    window.speechSynthesis.speak(currentUtterance);
  }

  // 모든 🔊 버튼에 클릭 바인딩
  document.querySelectorAll('.btn-tts').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const text = btn.getAttribute('data-tts');
      speakText(text, btn);
    });
  });


  // ==========================================
  // D. 페이지 전환 제어
  // ==========================================
  function showPanel(stepNum) {
    // 음성 재생 중이면 끄기
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      document.querySelectorAll('.btn-tts').forEach(b => b.classList.remove('speaking'));
    }

    state.currentStep = stepNum;
    
    document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active-panel'));
    const target = document.getElementById(`step-${stepNum}-panel`);
    if (target) {
      target.classList.add('active-panel');
      target.scrollIntoView({ behavior: 'smooth' });
    }

    if (stepNum === 6) {
      renderCertificate();
    }
  }

  function updateNavigationUI() {
    const nav = document.querySelector('.progress-nav');
    if (state.currentStep === 0) {
      nav.style.display = 'none';
      return;
    }
    nav.style.display = 'block';

    const pct = ONLY_SESSION_1 ? 100 : (((state.unlockedStep - 1) / 5) * 100);
    document.getElementById('progress-bar-fill').style.width = `${pct}%`;

    const track = document.querySelector('.progress-track');
    if (track) {
      track.style.display = ONLY_SESSION_1 ? 'none' : '';
    }

    for (let i = 1; i <= 6; i++) {
      const node = document.getElementById(`nav-step-${i}`);
      if (!node) continue;

      if (ONLY_SESSION_1 && i > 1) {
        node.style.display = 'none';
        continue;
      } else {
        node.style.display = '';
      }

      node.className = 'step-node';
      if (i < state.unlockedStep) {
        node.classList.add('completed');
      } else if (i === state.currentStep) {
        node.classList.add('active');
      } else if (i > state.unlockedStep) {
        node.classList.add('locked');
      }
    }

    checkButtons();
  }

  function checkButtons() {
    const btn2 = document.getElementById('btn-finish-step1');
    if (btn2) btn2.disabled = state.unlockedStep < 2;

    const btn3 = document.getElementById('btn-next-to-3');
    if (btn3) btn3.disabled = state.unlockedStep < 3;

    const btn4 = document.getElementById('btn-next-to-4');
    if (btn4) btn4.disabled = state.unlockedStep < 4;

    const btn5 = document.getElementById('btn-next-to-5');
    if (btn5) btn5.disabled = state.unlockedStep < 5;

    const btn6 = document.getElementById('btn-next-to-6');
    if (btn6) btn6.disabled = state.unlockedStep < 6;
  }

  function unlockNext(currentFinished) {
    if (ONLY_SESSION_1) return;
    if (state.unlockedStep === currentFinished) {
      state.unlockedStep = currentFinished + 1;
      localStorage.setItem('barGraph_unlockedStep', state.unlockedStep);
    }
    updateNavigationUI();
  }

  document.querySelectorAll('.step-node').forEach(node => {
    node.addEventListener('click', () => {
      const step = parseInt(node.getAttribute('data-step'), 10);
      if (ONLY_SESSION_1 && step > 1) return;
      if (step <= state.unlockedStep) {
        showPanel(step);
        updateNavigationUI();
      }
    });
  });


  // ==========================================
  // E. 0단계: 오리엔테이션 이름 등록
  // ==========================================
  document.getElementById('btn-start-adventure').addEventListener('click', () => {
    const input = document.getElementById('student-name-input').value.trim();
    if (!input) {
      alert('어린이 탐험가의 이름을 입력해주세요! 😊');
      return;
    }
    state.studentName = input;
    localStorage.setItem('barGraph_studentName', input);
    localStorage.setItem('barGraph_unlockedStep', 1);

    document.getElementById('student-name-display').textContent = `${input} 탐험가`;
    document.getElementById('cert-name-label').textContent = input;

    state.unlockedStep = 1;
    showPanel(1);
    updateNavigationUI();
    playConfetti();
  });


  // ==========================================
  // F. 1단계: 막대그래프의 구성 요소 및 개념 학습 (활동 1-1 ~ 1-4)
  // ==========================================

  // 활동 1-1 질문지 조작 시 예시 그래프 하이라이트 활성화
  const q111 = document.getElementById('q1-1-1');
  const q112 = document.getElementById('q1-1-2');
  const q113 = document.getElementById('q1-1-3');
  const graphContainer11 = document.querySelector('#sub-step-1-1 .challenge-graph-container');

  if (q111 && graphContainer11) {
    ['mouseenter', 'focusin'].forEach(evt => {
      q111.addEventListener(evt, () => graphContainer11.classList.add('highlight-x-active'));
    });
    ['mouseleave', 'focusout'].forEach(evt => {
      q111.addEventListener(evt, () => graphContainer11.classList.remove('highlight-x-active'));
    });
  }
  if (q112 && graphContainer11) {
    ['mouseenter', 'focusin'].forEach(evt => {
      q112.addEventListener(evt, () => graphContainer11.classList.add('highlight-y-active'));
    });
    ['mouseleave', 'focusout'].forEach(evt => {
      q112.addEventListener(evt, () => graphContainer11.classList.remove('highlight-y-active'));
    });
  }
  if (q113 && graphContainer11) {
    ['mouseenter', 'focusin'].forEach(evt => {
      q113.addEventListener(evt, () => graphContainer11.classList.add('highlight-grid-active'));
    });
    ['mouseleave', 'focusout'].forEach(evt => {
      q113.addEventListener(evt, () => graphContainer11.classList.remove('highlight-grid-active'));
    });
  }

  // 활동 1-2 질문지 조작 시 예시 가로그래프 하이라이트 활성화
  const q121 = document.getElementById('q1-2-1');
  const q122 = document.getElementById('q1-2-2');
  const q123 = document.getElementById('q1-2-3');
  const graphContainer12 = document.getElementById('graph-12-b');
  if (q121 && graphContainer12) {
    ['mouseenter', 'focusin'].forEach(evt => {
      q121.addEventListener(evt, () => graphContainer12.classList.add('highlight-x-active'));
    });
    ['mouseleave', 'focusout'].forEach(evt => {
      q121.addEventListener(evt, () => graphContainer12.classList.remove('highlight-x-active'));
    });
  }
  if (q122 && graphContainer12) {
    ['mouseenter', 'focusin'].forEach(evt => {
      q122.addEventListener(evt, () => graphContainer12.classList.add('highlight-y-active'));
    });
    ['mouseleave', 'focusout'].forEach(evt => {
      q122.addEventListener(evt, () => graphContainer12.classList.remove('highlight-y-active'));
    });
  }
  if (q123 && graphContainer12) {
    ['mouseenter', 'focusin'].forEach(evt => {
      q123.addEventListener(evt, () => graphContainer12.classList.add('highlight-grid-active'));
    });
    ['mouseleave', 'focusout'].forEach(evt => {
      q123.addEventListener(evt, () => graphContainer12.classList.remove('highlight-grid-active'));
    });
  }

  // 활동 1-1: 가로/세로/눈금 퀴즈 검사
  const btnCheckSub11 = document.getElementById('btn-check-sub11');
  if (btnCheckSub11) {
    btnCheckSub11.addEventListener('click', () => {
      const q1 = document.querySelector('input[name="q11_1"]:checked');
      const q2 = document.querySelector('input[name="q11_2"]:checked');
      const q3 = document.querySelector('input[name="q11_3"]:checked');
      const fb = document.getElementById('sub11-feedback');
      const nextBtn = document.getElementById('btn-go-to-12');

      if (!q1 || !q2 || !q3) {
        fb.textContent = '⚠️ 아직 답을 고르지 않은 문항이 있습니다.';
        fb.className = 'quiz-feedback error';
        fb.style.display = 'block';
        return;
      }

      const isQ1Correct = q1.value === 'a'; // 요일
      const isQ2Correct = q2.value === 'b'; // 책의 수 (권)
      const isQ3Correct = q3.value === '2'; // 2권

      if (isQ1Correct && isQ2Correct && isQ3Correct) {
        fb.innerHTML = '정답입니다! 🎉 가로는 요일, 세로는 책의 수(권)를 나타내며 세로 눈금 한 칸은 2권입니다. 아래의 활동 2로 가기 버튼을 눌러주세요!';
        fb.className = 'quiz-feedback success';
        fb.style.display = 'block';
        if (nextBtn) nextBtn.disabled = false;
        playConfetti();
      } else {
        let wrongMsg = '틀린 문제가 있습니다. 다시 한번 읽어보세요. 😢';
        if (!isQ1Correct) wrongMsg += '<br>- Q1 힌트: 가로(바닥선)에 무엇이 쓰여 있나요?';
        if (!isQ2Correct) wrongMsg += '<br>- Q2 힌트: 세로(높이선)에 무엇이 쓰여 있나요?';
        if (!isQ3Correct) wrongMsg += '<br>- Q3 힌트: 세로 눈금 0의 다음 숫자가 2이므로 한 칸은 2권입니다.';
        fb.innerHTML = wrongMsg;
        fb.className = 'quiz-feedback error';
        fb.style.display = 'block';
      }
    });
  }

  // 활동 1-1 -> 1-2 전환
  const btnGoTo12 = document.getElementById('btn-go-to-12');
  if (btnGoTo12) {
    btnGoTo12.addEventListener('click', () => {
      const sub11 = document.getElementById('sub-step-1-1');
      const sub12 = document.getElementById('sub-step-1-2');
      if (sub11) sub11.style.display = 'none';
      if (sub12) {
        sub12.style.display = 'block';
        sub12.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // 활동 1-2 -> 1-1 되돌아가기
  const btnBackTo11 = document.getElementById('btn-back-to-11');
  if (btnBackTo11) {
    btnBackTo11.addEventListener('click', () => {
      const sub11 = document.getElementById('sub-step-1-1');
      const sub12 = document.getElementById('sub-step-1-2');
      if (sub12) sub12.style.display = 'none';
      if (sub11) {
        sub11.style.display = 'block';
        sub11.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // 활동 1-2: 가로 막대그래프 축 전환 퀴즈 검사
  const btnCheckSub12 = document.getElementById('btn-check-sub12');
  if (btnCheckSub12) {
    btnCheckSub12.addEventListener('click', () => {
      const q1 = document.querySelector('input[name="q12_1"]:checked');
      const q2 = document.querySelector('input[name="q12_2"]:checked');
      const q3 = document.querySelector('input[name="q12_3"]:checked');
      const fb = document.getElementById('sub12-feedback');
      const nextBtn = document.getElementById('btn-go-to-13');

      if (!q1 || !q2 || !q3) {
        fb.textContent = '⚠️ 아직 답을 고르지 않은 문항이 있습니다.';
        fb.className = 'quiz-feedback error';
        fb.style.display = 'block';
        return;
      }

      const isQ1Correct = q1.value === 'b'; // 책의 수 (권)
      const isQ2Correct = q2.value === 'a'; // 요일
      const isQ3Correct = q3.value === '5'; // 5권

      if (isQ1Correct && isQ2Correct && isQ3Correct) {
        fb.innerHTML = '정답입니다! 🎉 가로는 책의 수(권), 세로는 요일을 나타내며 가로 눈금 한 칸은 5권입니다. 아래의 활동 3으로 가기 버튼을 눌러주세요!';
        fb.className = 'quiz-feedback success';
        fb.style.display = 'block';
        if (nextBtn) nextBtn.disabled = false;
        playConfetti();
      } else {
        let wrongMsg = '틀린 문제가 있습니다. 다시 한번 읽어보세요. 😢';
        if (!isQ1Correct) wrongMsg += '<br>- Q1 힌트: 누워있는 막대의 길이(가로 방향)가 무엇을 뜻하고 있나요?';
        if (!isQ2Correct) wrongMsg += '<br>- Q2 힌트: 왼쪽 세로 방향에 무엇이 위아래로 쓰여 있나요?';
        if (!isQ3Correct) wrongMsg += '<br>- Q3 힌트: 바닥선(가로)의 눈금이 0, 5, 10 순서로 가고 있습니다.';
        fb.innerHTML = wrongMsg;
        fb.className = 'quiz-feedback error';
        fb.style.display = 'block';
      }
    });
  }

  // 활동 1-2 -> 1-3 전환
  const btnGoTo13 = document.getElementById('btn-go-to-13');
  if (btnGoTo13) {
    btnGoTo13.addEventListener('click', () => {
      const sub12 = document.getElementById('sub-step-1-2');
      const sub13 = document.getElementById('sub-step-1-3');
      if (sub12) sub12.style.display = 'none';
      if (sub13) {
        sub13.style.display = 'block';
        sub13.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // 활동 1-3 -> 1-2 되돌아가기
  const btnBackTo12 = document.getElementById('btn-back-to-12');
  if (btnBackTo12) {
    btnBackTo12.addEventListener('click', () => {
      const sub12 = document.getElementById('sub-step-1-2');
      const sub13 = document.getElementById('sub-step-1-3');
      if (sub13) sub13.style.display = 'none';
      if (sub12) {
        sub12.style.display = 'block';
        sub12.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // 활동 1-3: 표 vs 막대그래프 장단점 비교 퀴즈 검사
  const btnCheckSub13 = document.getElementById('btn-check-sub13');
  if (btnCheckSub13) {
    btnCheckSub13.addEventListener('click', () => {
      const q1 = document.querySelector('input[name="q13_1"]:checked');
      const q2 = document.querySelector('input[name="q13_2"]:checked');
      const fb = document.getElementById('sub13-feedback');
      const nextBtn = document.getElementById('btn-go-to-14');

      if (!q1 || !q2) {
        fb.textContent = '⚠️ 아직 답을 고르지 않은 문항이 있습니다.';
        fb.className = 'quiz-feedback error';
        fb.style.display = 'block';
        return;
      }

      const isQ1Correct = q1.value === 'table';
      const isQ2Correct = q2.value === 'graph';

      if (isQ1Correct && isQ2Correct) {
        fb.innerHTML = '정답입니다! 🎉 표는 정확한 합계와 수치를 알기 쉽고, 막대그래프는 수량의 크기를 한눈에 비교하기 편리하다는 각각의 매력이 있습니다. 마무리 연습 문제로 가보세요!';
        fb.className = 'quiz-feedback success';
        fb.style.display = 'block';
        if (nextBtn) nextBtn.disabled = false;
        playConfetti();
      } else {
        let wrongMsg = '틀린 매칭이 있습니다. 다시 확인해 보세요. 😢';
        if (!isQ1Correct) wrongMsg += '<br>- Q1 힌트: 모든 개수의 합계나 정확한 개별 숫자가 딱 떨어져 있는 표가 더 확인하기 편리해요.';
        if (!isQ2Correct) wrongMsg += '<br>- Q2 힌트: 막대의 높낮이를 보고 가장 긴 것과 짧은 것을 한눈에 직관적으로 보려면 막대그래프가 편리해요.';
        fb.innerHTML = wrongMsg;
        fb.className = 'quiz-feedback error';
        fb.style.display = 'block';
      }
    });
  }

  // 활동 1-3 -> 1-4 전환
  const btnGoTo14 = document.getElementById('btn-go-to-14');
  if (btnGoTo14) {
    btnGoTo14.addEventListener('click', () => {
      const sub13 = document.getElementById('sub-step-1-3');
      const sub14 = document.getElementById('sub-step-1-4');
      if (sub13) sub13.style.display = 'none';
      if (sub14) {
        sub14.style.display = 'block';
        sub14.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // 활동 1-4 -> 1-3 되돌아가기
  const btnBackTo13 = document.getElementById('btn-back-to-13');
  if (btnBackTo13) {
    btnBackTo13.addEventListener('click', () => {
      const sub13 = document.getElementById('sub-step-1-3');
      const sub14 = document.getElementById('sub-step-1-4');
      if (sub14) sub14.style.display = 'none';
      if (sub13) {
        sub13.style.display = 'block';
        sub13.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // 활동 1-4: 마무리 연습 문제 퀴즈 검사
  const btnCheckSub14 = document.getElementById('btn-check-sub14');
  if (btnCheckSub14) {
    btnCheckSub14.addEventListener('click', () => {
      const q1 = document.querySelector('input[name="q14_1"]:checked');
      const q2 = document.querySelector('input[name="q14_2"]:checked');
      const fb = document.getElementById('sub14-feedback');
      const finishBtn = document.getElementById('btn-finish-step1');

      if (!q1 || !q2) {
        fb.textContent = '⚠️ 아직 답을 고르지 않은 문항이 있습니다.';
        fb.className = 'quiz-feedback error';
        fb.style.display = 'block';
        return;
      }

      const isQ1Correct = q1.value === '5'; // 5명
      const isQ2Correct = q2.value === '20'; // 20명

      if (isQ1Correct && isQ2Correct) {
        fb.innerHTML = '축하합니다! 💮 오늘 배운 기초적인 막대그래프 개념을 완벽히 소화하셨습니다! 이제 아래 버튼을 클릭하여 2단계로 나아가세요!';
        fb.className = 'quiz-feedback success';
        fb.style.display = 'block';
        if (finishBtn) finishBtn.disabled = false;
        unlockNext(1);
        playConfetti();
      } else {
        let wrongMsg = '아쉽게도 틀린 문항이 있습니다. 다시 풀어보세요. 😢';
        if (!isQ1Correct) wrongMsg += '<br>- Q1 힌트: 세로 눈금 0 다음의 첫 번째 숫자가 5이므로 눈금 한 칸은 5명입니다.';
        if (!isQ2Correct) wrongMsg += '<br>- Q2 힌트: 파란색 막대 높이가 가리키는 세로 눈금의 숫자를 읽어보세요.';
        fb.innerHTML = wrongMsg;
        fb.className = 'quiz-feedback error';
        fb.style.display = 'block';
      }
    });
  }

  // 1차시 전용 완료 모달창 띄우기 함수
  function showSession1Completion() {
    speakText('축하합니다! 일차시 막대그래프의 약속 배우기 모험을 모두 성공적으로 마쳤습니다! 참 잘했습니다! 🚀');

    const modal = document.createElement('div');
    modal.id = 'completion-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(15, 23, 42, 0.75)';
    modal.style.backdropFilter = 'blur(12px)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '10000';
    modal.style.animation = 'fade-in 0.4s ease forwards';

    const card = document.createElement('div');
    card.style.background = 'white';
    card.style.padding = '40px 30px';
    card.style.borderRadius = 'var(--border-radius-lg)';
    card.style.boxShadow = 'var(--box-shadow-hover)';
    card.style.textAlign = 'center';
    card.style.maxWidth = '500px';
    card.style.width = '90%';
    card.style.transform = 'scale(0.8)';
    card.style.animation = 'scale-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
    card.style.border = '4px solid var(--color-success)';

    card.innerHTML = `
      <div style="font-size: 5rem; margin-bottom: 20px; animation: wave-hand 2s ease infinite;">💮</div>
      <h2 style="color: var(--color-success); font-size: 2.2rem; font-weight: 900; margin-bottom: 15px;">1차시 모험 클리어!</h2>
      <p style="font-size: 1.15rem; color: var(--color-text-main); font-weight: 700; margin-bottom: 10px;">
        ${state.studentName} 탐험가님, 정말 대단해요!
      </p>
      <p style="font-size: 1.05rem; color: var(--color-text-muted); line-height: 1.6; margin-bottom: 30px;">
        막대그래프의 가로, 세로, 그리고 눈금 한 칸의 약속을 완벽하게 이해하고 퀴즈를 모두 맞혔습니다. 다음 시간에 더 흥미진진한 모험으로 만나요! 📚✨
      </p>
      <button id="btn-close-completion" class="btn btn-success btn-large" style="width: 100%;">
        완료하고 확인하기 ✔️
      </button>
    `;

    modal.appendChild(card);
    document.body.appendChild(modal);

    playConfetti();

    document.getElementById('btn-close-completion').addEventListener('click', () => {
      modal.style.animation = 'fade-out 0.3s ease forwards';
      setTimeout(() => {
        modal.remove();
      }, 300);
    });
  }

  // 1단계 클리어 후 2단계 패널 전환
  const btnFinishStep1 = document.getElementById('btn-finish-step1');
  if (btnFinishStep1) {
    btnFinishStep1.addEventListener('click', () => {
      if (ONLY_SESSION_1) {
        showSession1Completion();
      } else {
        showPanel(2);
        updateNavigationUI();
      }
    });
  }


  // ==========================================
  // G. 2단계: 눈금 읽기 오개념 격파 (잠금 미션 + 분석 퀴즈 + 함정 퀴즈)
  // ==========================================
  let isScaleUnlocked = false;

  // 열쇠 적용하기 (눈금 한 칸 맞추기)
  document.getElementById('btn-unlock-scale').addEventListener('click', () => {
    const checked = document.querySelector('input[name="scale_unlock_val"]:checked');
    const fb = document.getElementById('scale-unlock-feedback');
    const chartWrapper = document.getElementById('reading-challenge-wrapper');

    if (!checked) {
      fb.textContent = '🔒 눈금 한 칸의 값을 선택하고 열쇠를 적용해봐!';
      fb.className = 'quiz-feedback error';
      return;
    }

    if (checked.value === '2') {
      isScaleUnlocked = true;
      fb.textContent = '🔓 딩동댕! 세로 눈금이 0, 2, 4, 6... 이므로 한 칸은 2명을 나타냅니다! 그래프의 잠금이 해제되었습니다!';
      fb.className = 'quiz-feedback success';
      chartWrapper.classList.remove('locked-chart');
      document.getElementById('btn-check-step2').disabled = false;
      document.getElementById('scale-lock-box').style.border = '2px solid var(--color-success)';
      playConfetti();
    } else {
      fb.innerHTML = '❌ 틀렸어요. 세로의 가장 아랫값은 0이고, 그다음 눈금의 숫자는 무엇인지 자세히 확인해 보세요.';
      fb.className = 'quiz-feedback error';
    }
  });

  // 미션 2: 그래프 일반 퀴즈 풀기
  document.getElementById('btn-check-step2').addEventListener('click', () => {
    if (!isScaleUnlocked) return;

    const q1 = document.querySelector('input[name="q2_1"]:checked');
    const q2 = document.querySelector('input[name="q2_2"]:checked');
    const fb = document.getElementById('step2-feedback');

    if (!q1 || !q2) {
      fb.textContent = '⚠️ 아직 답을 고르지 않은 문항이 있습니다.';
      fb.className = 'quiz-feedback error';
      return;
    }

    const isQ1Correct = q1.value === 'b';
    // 햄스터는 눈금 2와 4의 정가운데(3명)에 있으므로 '3'이 정답
    const isQ2Correct = q2.value === '3';

    if (isQ1Correct && isQ2Correct) {
      fb.textContent = '대단해요! 눈금 한 칸이 2명이고 햄스터 막대는 2와 4의 중앙에 있어 3명임을 정확히 파악했습니다. 마지막 미션이 나타났습니다!';
      fb.className = 'quiz-feedback success';
      
      // 함정 박스 활성화
      document.getElementById('bar-length-trap-box').style.display = 'block';
      document.getElementById('bar-length-trap-box').scrollIntoView({ behavior: 'smooth' });
      playConfetti();
    } else {
      let wrongMsg = '틀린 문제가 있습니다. 다시 한번 읽어보세요.';
      if (!isQ1Correct) wrongMsg += '<br>- Q1 힌트: 가로에는 반려동물(강아지, 고양이...)이 나열되어 있습니다.';
      if (!isQ2Correct) wrongMsg += '<br>- Q2 힌트: 햄스터의 막대 끝이 가리키는 높이가 눈금 2와 4의 정가운데에 있습니다.';
      fb.innerHTML = wrongMsg;
      fb.className = 'quiz-feedback error';
    }
  });

  // 미션 3: 함정 퀴즈 풀기
  document.getElementById('btn-check-trap').addEventListener('click', () => {
    const qTrap = document.querySelector('input[name="q2_trap"]:checked');
    const fb = document.getElementById('trap-feedback');

    if (!qTrap) {
      fb.textContent = '⚠️ 보기를 선택해주세요!';
      fb.className = 'quiz-feedback error';
      return;
    }

    if (qTrap.value === 'B') {
      fb.innerHTML = '성공! 🎉 그래프 B는 막대 길이는 3칸에 불과하지만 눈금 한 칸이 5명이어서 총 15명을 나타내므로, 8칸짜리(눈금 1명) 그래프 A(8명)보다 큽니다. 막대 길이보다 눈금 크기를 확인하는 것이 얼마나 중요한지 확인하셨죠?';
      fb.className = 'quiz-feedback success';
      unlockNext(2);
      playConfetti();
    } else {
      fb.innerHTML = '❌ 함정에 빠지셨군요! 겉모습만 보고 A를 고르면 안 됩니다. 그래프 A는 8명(8칸x1명)을 나타내지만, B는 15명(3칸x5명)을 나타냅니다. 눈금 크기를 곱해서 확인하세요!';
      fb.className = 'quiz-feedback error';
    }
  });

  document.getElementById('btn-next-to-3').addEventListener('click', () => {
    showPanel(3);
    updateNavigationUI();
  });


  // ==========================================
  // H. 3단계: 그래프 그리기 조작 및 실시간 채점 피드백
  // ==========================================
  function updateDrawingUI() {
    Object.keys(state.drawingData).forEach(day => {
      const val = state.drawingData[day];
      const target = TARGET_DRAWING[day];
      const bar = document.getElementById(`bar-${day}`);
      const cell = document.querySelector(`.target-cell[data-target="${day}"]`);

      if (bar) {
        const pct = (val / 30) * 100;
        bar.style.height = `${pct}%`;
        const hint = bar.querySelector('.bar-val-hint');
        if (hint) {
          hint.textContent = `${val}분`;
        }

        // 목표에 일치하면 즉시 시각적 피드백 주기
        if (val === target) {
          bar.classList.add('correct-height');
          if (cell) cell.classList.add('success-cell');
        } else {
          bar.classList.remove('correct-height');
          if (cell) cell.classList.remove('success-cell');
        }
      }
    });
  }

  document.querySelectorAll('.btn-adjust').forEach(btn => {
    btn.addEventListener('click', () => {
      const day = btn.getAttribute('data-day');
      const isUp = btn.classList.contains('btn-up');
      let val = state.drawingData[day];

      if (isUp) {
        if (val < 30) val += 5; // 한 칸 크기 5분
      } else {
        if (val > 0) val -= 5;
      }

      state.drawingData[day] = val;
      updateDrawingUI();
    });
  });

  document.getElementById('btn-check-drawing').addEventListener('click', () => {
    const fb = document.getElementById('drawing-feedback');
    const isCorrect = Object.keys(TARGET_DRAWING).every(day => {
      return state.drawingData[day] === TARGET_DRAWING[day];
    });

    if (isCorrect) {
      fb.textContent = '참 잘했습니다! 💮 완벽하게 주간 독서 시간 그래프를 완성했어요. 요일별 목표 시간에 완벽히 부합합니다.';
      fb.className = 'quiz-feedback success';
      unlockNext(3);
      playConfetti();
    } else {
      fb.textContent = '❌ 아직 수치가 맞지 않는 요일이 있어요. 월요일은 15분(3칸), 화요일은 25분(5칸), 수요일은 5분(1칸), 목요일은 30분(6칸), 금요일은 20분(4칸)에 도달해야 합니다!';
      fb.className = 'quiz-feedback error';
    }
  });

  document.getElementById('btn-next-to-4').addEventListener('click', () => {
    showPanel(4);
    updateNavigationUI();
    renderPreviewGraph();
  });


  // ==========================================
  // I. 4단계: 실시간 그래프 작성 및 모둠 릴레이
  // ==========================================
  const inputsWrap = document.getElementById('custom-inputs-list');

  document.getElementById('btn-add-row').addEventListener('click', () => {
    const rows = inputsWrap.querySelectorAll('.input-row');
    if (rows.length >= 5) {
      alert('항목은 최대 5개까지만 그릴 수 있어요!');
      return;
    }
    const newRow = document.createElement('div');
    newRow.className = 'input-row';
    newRow.innerHTML = `
      <input type="text" class="category-name" value="" placeholder="항목 이름">
      <input type="number" class="category-val" value="0" min="0" max="50">
      <span class="unit-suffix">${state.customGraph.unit}</span>
    `;
    inputsWrap.appendChild(newRow);
    bindInputs();
  });

  function bindInputs() {
    const titleIn = document.getElementById('step4-title');
    const unitIn = document.getElementById('step4-y-unit');

    titleIn.addEventListener('input', () => {
      state.customGraph.title = titleIn.value || '무제';
      document.getElementById('preview-graph-title').textContent = state.customGraph.title;
    });

    unitIn.addEventListener('input', () => {
      state.customGraph.unit = unitIn.value || '개';
      document.querySelectorAll('.unit-suffix').forEach(s => s.textContent = state.customGraph.unit);
      renderPreviewGraph();
    });

    inputsWrap.querySelectorAll('input').forEach(i => {
      i.removeEventListener('input', onInputsChanged);
      i.addEventListener('input', onInputsChanged);
    });
  }

  function onInputsChanged() {
    const items = [];
    inputsWrap.querySelectorAll('.input-row').forEach(row => {
      const name = row.querySelector('.category-name').value.trim() || '미지정';
      const val = parseInt(row.querySelector('.category-val').value, 10) || 0;
      items.push({ name, val });
    });
    state.customGraph.items = items;
    renderPreviewGraph();
  }

  function renderPreviewGraph() {
    const barWrap = document.getElementById('preview-bars-wrapper');
    const yScale = document.getElementById('preview-y-scale');
    const yLabel = document.getElementById('preview-y-label');

    barWrap.innerHTML = '';
    yScale.innerHTML = '';
    yLabel.textContent = `단위 (${state.customGraph.unit})`;

    const items = state.customGraph.items;
    if (items.length === 0) return;

    const maxVal = Math.max(...items.map(x => x.val), 4);
    const roundMax = Math.ceil(maxVal / 4) * 4;
    const step = roundMax / 4;

    for (let i = roundMax; i >= 0; i -= step) {
      const l = document.createElement('div');
      l.textContent = i;
      yScale.appendChild(l);
    }

    items.forEach(item => {
      const col = document.createElement('div');
      col.className = 'preview-bar-col';
      const pct = (item.val / roundMax) * 100;
      col.innerHTML = `
        <div class="preview-bar" style="height: ${pct}%;">
          <div class="preview-val-label">${item.val}${state.customGraph.unit}</div>
        </div>
        <div class="bar-name">${item.name}</div>
      `;
      barWrap.appendChild(col);
    });
  }

  // 그래프 제출 및 저장 -> 모둠 릴레이 활성화
  document.getElementById('btn-save-custom-graph').addEventListener('click', () => {
    const empty = state.customGraph.items.some(i => !i.name || i.name === '미지정');
    if (empty) {
      alert('항목 이름과 값을 모두 채워주세요!');
      return;
    }

    localStorage.setItem('barGraph_customGraph', JSON.stringify(state.customGraph));
    
    const fb = document.getElementById('step4-feedback');
    fb.textContent = '내 그래프가 저장되었습니다! 모둠 릴레이 활동으로 내려가세요. 💾';
    fb.className = 'quiz-feedback success';

    // 모둠 활동 박스 오픈 및 스크롤
    const relayBox = document.getElementById('modum-relay-section');
    relayBox.style.display = 'block';
    relayBox.scrollIntoView({ behavior: 'smooth' });
    playConfetti();
  });

  // --- 모둠 릴레이 내부 로직 ---
  let activeReviewer = '';

  // 1. 리뷰어 시작 등록
  document.getElementById('btn-start-review').addEventListener('click', () => {
    const nameInput = document.getElementById('relay-reviewer-name').value.trim();
    if (!nameInput) {
      alert('평가할 친구의 이름을 적어주세요!');
      return;
    }

    activeReviewer = nameInput;
    document.getElementById('active-reviewer-name').textContent = nameInput;

    // 작업영역 노출, 등록 카드 은닉
    document.getElementById('relay-setup-card').style.display = 'none';
    document.getElementById('relay-review-workspace').style.display = 'block';

    // AI 동적 문제 생성
    generateAIDynamicQuizzes();
  });

  function generateAIDynamicQuizzes() {
    const container = document.getElementById('dynamic-relay-quizzes');
    container.innerHTML = '';

    const items = state.customGraph.items;
    if (items.length < 2) return;

    // 1번 문항: 가장 수량이 많은 항목 찾기
    const sorted = [...items].sort((a,b) => b.val - a.val);
    const maxItem = sorted[0];

    const q1Div = document.createElement('div');
    q1Div.className = 'step-quiz-item';
    q1Div.innerHTML = `
      <p><strong>Q1. 그래프에서 가장 높은 수량을 나타내는 항목은 무엇인가요?</strong></p>
      <div class="radio-options">
        ${items.map((it, idx) => `
          <label><input type="radio" name="relay_q1" value="${it.name}"> ${it.name}</label>
        `).join('')}
      </div>
    `;
    container.appendChild(q1Div);

    // 2번 문항: 특정 무작위 항목의 값 맞추기
    const randomIdx = Math.floor(Math.random() * items.length);
    const targetItem = items[randomIdx];
    // 오답용 무작위 보기 생성
    const wrongAns1 = targetItem.val + 2;
    const wrongAns2 = Math.max(targetItem.val - 3, 1);

    const optionsSet = new Set([targetItem.val, wrongAns1, wrongAns2]);
    const optionsArr = Array.from(optionsSet).sort((a,b) => a-b);

    const q2Div = document.createElement('div');
    q2Div.className = 'step-quiz-item';
    q2Div.innerHTML = `
      <p><strong>Q2. [ ${targetItem.name} ] 항목의 정확한 수량은 몇 ${state.customGraph.unit}인가요?</strong></p>
      <div class="radio-options">
        ${optionsArr.map(val => `
          <label><input type="radio" name="relay_q2" value="${val}"> ${val}${state.customGraph.unit}</label>
        `).join('')}
      </div>
    `;
    container.appendChild(q2Div);

    // 칭찬 칩 리셋 및 핸들러 리바인딩
    document.querySelectorAll('.btn-chip').forEach(chip => {
      chip.classList.remove('selected');
      chip.onclick = () => {
        document.querySelectorAll('.btn-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        document.getElementById('relay-comment-text').value = chip.textContent;
      };
    });
  }

  // 2. 동료 평가 제출
  document.getElementById('btn-submit-review').addEventListener('click', () => {
    const chkCorrect = document.getElementById('chk-graph-correct').checked;
    const ansQ1 = document.querySelector('input[name="relay_q1"]:checked');
    const ansQ2 = document.querySelector('input[name="relay_q2"]:checked');
    const comment = document.getElementById('relay-comment-text').value.trim();

    if (!chkCorrect) {
      alert('1번 문항의 친구 그래프 검토(정확성 확인 체크박스)를 완료해 주세요!');
      return;
    }
    if (!ansQ1 || !ansQ2) {
      alert('친구 그래프 퀴즈를 모두 해결해 주세요!');
      return;
    }
    if (!comment) {
      alert('친구에게 보낼 응원의 코멘트를 입력해 주세요!');
      return;
    }

    // AI 퀴즈 정답 검증
    const items = state.customGraph.items;
    const sorted = [...items].sort((a,b) => b.val - a.val);
    const correctAns1 = sorted[0].name;

    const q2Label = document.querySelector('input[name="relay_q2"]').closest('.step-quiz-item').querySelector('p strong').textContent;
    const match = q2Label.match(/\[ (.*) \]/);
    const targetName = match ? match[1] : '';
    const targetItem = items.find(x => x.name === targetName);
    const correctAns2 = targetItem ? targetItem.val.toString() : '';

    const score = (ansQ1.value === correctAns1 ? 1 : 0) + (ansQ2.value === correctAns2 ? 1 : 0);

    // 데이터 누적
    state.reviews.push({
      reviewerName: activeReviewer,
      comment: comment,
      isCorrect: score === 2
    });

    localStorage.setItem('barGraph_reviews', JSON.stringify(state.reviews));

    // 리셋 후 화면 전환
    document.getElementById('relay-reviewer-name').value = '';
    document.getElementById('relay-comment-text').value = '';
    document.getElementById('chk-graph-correct').checked = false;

    document.getElementById('relay-review-workspace').style.display = 'none';
    document.getElementById('relay-setup-card').style.display = 'block';

    renderReviewersChips();
    playConfetti();
  });

  function renderReviewersChips() {
    const list = document.getElementById('completed-reviewers-list');
    if (state.reviews.length === 0) {
      list.innerHTML = `<span class="no-reviewer-msg">아직 평가한 친구가 없습니다. 첫 번째 릴레이를 시작해보세요!</span>`;
      return;
    }

    list.innerHTML = state.reviews.map(r => `
      <span class="reviewer-chip-active">🎖️ ${r.reviewerName} 평가위원 (${r.isCorrect ? '퀴즈 만점 💯' : '퀴즈 완료'})</span>
    `).join('');

    // 최소 2인 이상 리뷰 완료 시 5단계 락 해제
    if (state.reviews.length >= 2) {
      unlockNext(4);
    }
  }

  // 3. 모둠 릴레이 세션 강제/완전 종료
  document.getElementById('btn-end-relay-all').addEventListener('click', () => {
    if (state.reviews.length < 2) {
      alert('최소 2명 이상의 모둠원 친구들이 평가를 진행해야 단원을 마무리할 수 있습니다! (3인 모둠인 경우 2명 이상 필수)');
      return;
    }
    alert('모둠 릴레이가 최종 종료되었습니다! 5단계로 이동하여 생활 속 막대그래프를 학습하세요.');
    unlockNext(4);
    showPanel(5);
    updateNavigationUI();
  });

  document.getElementById('btn-next-to-5').addEventListener('click', () => {
    showPanel(5);
    updateNavigationUI();
  });


  // ==========================================
  // J. 5단계: 눈금 단위 크기 비교 학습 (물결선 배제 교과 적용)
  // ==========================================
  document.getElementById('btn-check-step5').addEventListener('click', () => {
    const q5 = document.querySelector('input[name="q5"]:checked');
    const fb = document.getElementById('step5-feedback');

    if (!q5) {
      fb.textContent = '⚠️ 보기 중 하나를 선택해 주세요!';
      fb.className = 'quiz-feedback error';
      return;
    }

    if (q5.value === 'b') {
      fb.innerHTML = '정답입니다! 🎉 눈금 한 칸의 크기가 커지면(1개 ➡️ 5개), 데이터를 표현하기 위한 세로 격자 수가 줄어들기 때문에 막대의 총길이가 상대적으로 **짧아지고 완만**해 보입니다. 겉모습이 달라도 실제 수치는 같으니 반드시 눈금을 먼저 보아야 합니다!';
      fb.className = 'quiz-feedback success';
      unlockNext(5);
      playConfetti();
    } else {
      fb.innerHTML = '아쉽게도 오답입니다. 눈금 한 칸이 1개일 때는 15개가 15칸 높이지만, 눈금 한 칸이 5개일 때는 3칸 높이로 표현됩니다. 눈금 크기가 커지면 막대는 더 어떻게 되나요?';
      fb.className = 'quiz-feedback error';
    }
  });

  document.getElementById('btn-next-to-6').addEventListener('click', () => {
    showPanel(6);
    updateNavigationUI();
  });


  // ==========================================
  // K. 6단계: 수료증 및 모둠 칭찬 목록 출력
  // ==========================================
  function renderCertificate() {
    document.getElementById('cert-name-label').textContent = state.studentName;
    document.getElementById('cert-portfolio-title').textContent = state.customGraph.title;

    const today = new Date();
    document.getElementById('cert-date-display').textContent = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

    // 1. 미니 맵 그리기
    const chartWrap = document.getElementById('cert-mini-chart-wrapper');
    chartWrap.innerHTML = '';
    const items = state.customGraph.items;
    const maxVal = Math.max(...items.map(x => x.val), 1);

    items.forEach(item => {
      const col = document.createElement('div');
      col.className = 'cert-mini-bar-col';
      const pct = (item.val / maxVal) * 100;
      col.innerHTML = `
        <span class="cert-mini-val">${item.val}</span>
        <div class="cert-mini-bar" style="height: ${pct * 0.7}px; min-height: 4px;"></div>
        <span class="cert-mini-label">${item.name}</span>
      `;
      chartWrap.appendChild(col);
    });

    // 2. 모둠원 코멘트 게시판 렌더링
    const commList = document.getElementById('cert-comments-list');
    if (state.reviews.length === 0) {
      commList.innerHTML = `<div class="comment-row">아직 등록된 모둠원 칭찬 코멘트가 없습니다.</div>`;
    } else {
      commList.innerHTML = state.reviews.map(r => `
        <div class="comment-row">
          <strong>💬 [${r.reviewerName} 평가위원]</strong> "${r.comment}"
        </div>
      `).join('');
    }
  }

  document.getElementById('btn-print-cert').addEventListener('click', () => {
    window.print();
  });

  document.getElementById('btn-restart-adventure').addEventListener('click', () => {
    if (confirm('학습 과정을 완전히 리셋하고 처음부터 다시 도전할까요?')) {
      localStorage.clear();
      state.studentName = '';
      state.unlockedStep = 1;
      state.currentStep = 0;
      state.drawingData = { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0 };
      state.customGraph = {
        title: '우리 반 친구들이 좋아하는 운동',
        unit: '명',
        items: [
          { name: '축구 ⚽', val: 8 },
          { name: '피구 🏐', val: 6 },
          { name: '줄넘기 🏃', val: 4 },
          { name: '야구 ⚾', val: 5 }
        ]
      };
      state.reviews = [];
      isScaleUnlocked = false;

      document.getElementById('student-name-input').value = '';
      document.getElementById('step4-title').value = state.customGraph.title;
      document.getElementById('step4-y-unit').value = state.customGraph.unit;

      document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
      document.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
      document.querySelectorAll('.quiz-feedback').forEach(fb => {
        fb.style.display = 'none';
        fb.textContent = '';
      });

      // UI 초기 상태화
      // 1단계 sub-steps 초기화
      const sub11 = document.getElementById('sub-step-1-1');
      const sub12 = document.getElementById('sub-step-1-2');
      const sub13 = document.getElementById('sub-step-1-3');
      const sub14 = document.getElementById('sub-step-1-4');
      if (sub11) sub11.style.display = 'block';
      if (sub12) sub12.style.display = 'none';
      if (sub13) sub13.style.display = 'none';
      if (sub14) sub14.style.display = 'none';

      const btn12 = document.getElementById('btn-go-to-12');
      const btn13 = document.getElementById('btn-go-to-13');
      const btn14 = document.getElementById('btn-go-to-14');
      const btnFinish = document.getElementById('btn-finish-step1');
      if (btn12) btn12.disabled = true;
      if (btn13) btn13.disabled = true;
      if (btn14) btn14.disabled = true;
      if (btnFinish) btnFinish.disabled = true;

      // 2단계 초기화
      const readingWrapper = document.getElementById('reading-challenge-wrapper');
      if (readingWrapper) readingWrapper.classList.add('locked-chart');
      const btnCheck2 = document.getElementById('btn-check-step2');
      if (btnCheck2) btnCheck2.disabled = true;
      const trapBox = document.getElementById('bar-length-trap-box');
      if (trapBox) trapBox.style.display = 'none';

      // 4단계 초기화
      const relaySection = document.getElementById('modum-relay-section');
      if (relaySection) relaySection.style.display = 'none';
      const reviewerNameInput = document.getElementById('relay-reviewer-name');
      if (reviewerNameInput) reviewerNameInput.value = '';
      const commentText = document.getElementById('relay-comment-text');
      if (commentText) commentText.value = '';

      updateDrawingUI();
      showPanel(0);
      updateNavigationUI();
    }
  });

  // ==========================================
  // L. 폭죽 파티클 애니메이션 엔진
  // ==========================================
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let animId;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * -canvas.height - 20;
      this.size = Math.random() * 8 + 6;
      this.color = `hsl(${Math.random() * 360}, 85%, 60%)`;
      this.speedY = Math.random() * 3 + 4;
      this.speedX = Math.random() * 2 - 1;
      this.rotation = Math.random() * 360;
      this.rotationSpeed = Math.random() * 4 - 2;
    }
    update() {
      this.y += this.speedY;
      this.x += this.speedX;
      this.rotation += this.rotationSpeed;
    }
    draw() {
      ctx.save();
      ctx.translate(this.x + this.size/2, this.y + this.size/2);
      ctx.rotate(this.rotation * Math.PI / 180);
      ctx.fillStyle = this.color;
      ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
      ctx.restore();
    }
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p, idx) => {
      p.update();
      p.draw();
      if (p.y > canvas.height) {
        particles.splice(idx, 1);
      }
    });

    if (particles.length > 0) {
      animId = requestAnimationFrame(loop);
    } else {
      cancelAnimationFrame(animId);
    }
  }

  function playConfetti() {
    for (let i = 0; i < 110; i++) {
      particles.push(new Particle());
    }
    if (particles.length === 110) {
      loop();
    }
  }

  // ==========================================
  // M. 초기 로딩 구동
  // ==========================================
  loadProgress();
  bindInputs();
  updateDrawingUI();

});
