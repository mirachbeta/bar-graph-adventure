/* ==========================================
   우당탕탕 막대그래프 대모험 - 핵심 로직 JS (최종본)
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
  
  // 수업 차시 제어: 1 = 1차시만, 2 = 2차시까지, 6 = 전체 사용
  const MAX_ENABLED_STEP = 6;
  
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
      if (state.unlockedStep > MAX_ENABLED_STEP) {
        state.unlockedStep = MAX_ENABLED_STEP;
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
      renderPreviewGraph();
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

    const pct = MAX_ENABLED_STEP === 1 ? 100 : (((state.unlockedStep - 1) / (MAX_ENABLED_STEP - 1)) * 100);
    document.getElementById('progress-bar-fill').style.width = `${pct}%`;

    const track = document.querySelector('.progress-track');
    if (track) {
      track.style.display = MAX_ENABLED_STEP === 1 ? 'none' : '';
    }

    for (let i = 1; i <= 6; i++) {
      const node = document.getElementById(`nav-step-${i}`);
      if (!node) continue;

      if (i > MAX_ENABLED_STEP) {
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
    if (currentFinished >= MAX_ENABLED_STEP) return;
    if (state.unlockedStep === currentFinished) {
      state.unlockedStep = currentFinished + 1;
      localStorage.setItem('barGraph_unlockedStep', state.unlockedStep);
    }
    updateNavigationUI();
  }

  document.querySelectorAll('.step-node').forEach(node => {
    node.addEventListener('click', () => {
      const step = parseInt(node.getAttribute('data-step'), 10);
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
  const q114 = document.getElementById('q1-1-4');
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
  if (q114 && graphContainer11) {
    ['mouseenter', 'focusin'].forEach(evt => {
      q114.addEventListener(evt, () => graphContainer11.classList.add('highlight-grid-active'));
    });
    ['mouseleave', 'focusout'].forEach(evt => {
      q114.addEventListener(evt, () => graphContainer11.classList.remove('highlight-grid-active'));
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

  // 활동 2-1 질문지 조작 시 예시 그래프 하이라이트 활성화
  const q211 = document.getElementById('q2-1-1');
  const q212 = document.getElementById('q2-1-2');
  const graphContainer21 = document.getElementById('graph-21-env');
  if (q211 && graphContainer21) {
    ['mouseenter', 'focusin'].forEach(evt => {
      q211.addEventListener(evt, () => graphContainer21.classList.add('highlight-x-active'));
    });
    ['mouseleave', 'focusout'].forEach(evt => {
      q211.addEventListener(evt, () => graphContainer21.classList.remove('highlight-x-active'));
    });
  }
  if (q212 && graphContainer21) {
    ['mouseenter', 'focusin'].forEach(evt => {
      q212.addEventListener(evt, () => graphContainer21.classList.add('highlight-y-active'));
    });
    ['mouseleave', 'focusout'].forEach(evt => {
      q212.addEventListener(evt, () => graphContainer21.classList.remove('highlight-y-active'));
    });
  }

  // 활동 1-1: 가로/세로/눈금 퀴즈 검사
  const btnCheckSub11 = document.getElementById('btn-check-sub11');
  if (btnCheckSub11) {
    btnCheckSub11.addEventListener('click', () => {
      const q1 = document.querySelector('input[name="q11_1"]:checked');
      const q2 = document.querySelector('input[name="q11_2"]:checked');
      const q3 = document.querySelector('input[name="q11_3"]:checked');
      const q4 = document.querySelector('input[name="q11_4"]:checked');
      const fb = document.getElementById('sub11-feedback');
      const nextBtn = document.getElementById('btn-go-to-12');

      if (!q1 || !q2 || !q3 || !q4) {
        fb.textContent = '⚠️ 아직 답을 고르지 않은 문항이 있습니다.';
        fb.className = 'quiz-feedback error';
        fb.style.display = 'block';
        return;
      }

      const isQ1Correct = q1.value === 'a'; // 학급 (반)
      const isQ2Correct = q2.value === 'b'; // 대출한 책의 수 (권)
      const isQ3Correct = q3.value === 'b'; // 대출한 책의 수 (권)
      const isQ4Correct = q4.value === '1'; // 1권

      if (isQ1Correct && isQ2Correct && isQ3Correct && isQ4Correct) {
        fb.innerHTML = '정답입니다! 🎉 가로는 학급(반), 세로는 대출한 책의 수(권)를 나타내며, 막대의 길이는 대출한 책의 수(권)를 뜻하고 세로 눈금 한 칸은 1권입니다. 아래의 활동 2로 가기 버튼을 눌러주세요!';
        fb.className = 'quiz-feedback success';
        fb.style.display = 'block';
        if (nextBtn) nextBtn.disabled = false;
        playConfetti();
      } else {
        let wrongMsg = '틀린 문제가 있습니다. 다시 한번 읽어보세요. 😢';
        if (!isQ1Correct) wrongMsg += '<br>- Q1 힌트: 가로(바닥선)에 무엇이 쓰여 있나요?';
        if (!isQ2Correct) wrongMsg += '<br>- Q2 힌트: 세로(높이선)에 무엇이 쓰여 있나요?';
        if (!isQ3Correct) wrongMsg += '<br>- Q3 힌트: 막대의 길이는 조사한 수량의 크기를 나타냅니다.';
        if (!isQ4Correct) wrongMsg += '<br>- Q4 힌트: 세로 눈금 0의 다음 숫자가 1이므로 한 칸은 1권입니다.';
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
      const q4Same = document.querySelector('input[name="q12_4_same"]:checked');
      const q4Diff = document.querySelector('input[name="q12_4_diff"]:checked');
      const fb = document.getElementById('sub12-feedback');
      const nextBtn = document.getElementById('btn-go-to-13');

      if (!q1 || !q2 || !q3 || !q4Same || !q4Diff) {
        fb.textContent = '⚠️ 아직 답을 고르지 않은 문항이 있습니다.';
        fb.className = 'quiz-feedback error';
        fb.style.display = 'block';
        return;
      }

      const isQ1Correct = q1.value === 'b'; // 대출한 책의 수 (권)
      const isQ2Correct = q2.value === 'a'; // 학급 (반)
      const isQ3Correct = q3.value === '5'; // 5권
      const isQ4SameCorrect = q4Same.value === 'a'; // 같은 점
      const isQ4DiffCorrect = q4Diff.value === 'b'; // 다른 점

      if (isQ1Correct && isQ2Correct && isQ3Correct && isQ4SameCorrect && isQ4DiffCorrect) {
        fb.innerHTML = '정답입니다! 🎉 가로 막대그래프에서는 가로는 대출한 책의 수(권), 세로는 학급(반)을 나타냅니다. 가로 눈금 한 칸은 5권이며, 두 그래프는 나타내는 수량은 같으나 가로와 세로의 위치와 막대의 방향이 바뀝니다. 활동 3으로 가기 버튼을 눌러주세요!';
        fb.className = 'quiz-feedback success';
        fb.style.display = 'block';
        if (nextBtn) nextBtn.disabled = false;
        playConfetti();
      } else {
        let wrongMsg = '틀린 문제가 있습니다. 다시 한번 읽어보세요. 😢';
        if (!isQ1Correct) wrongMsg += '<br>- Q1 힌트: 누워있는 막대의 길이(가로 방향)가 무엇을 뜻하고 있나요? (대출한 책의 수)';
        if (!isQ2Correct) wrongMsg += '<br>- Q2 힌트: 왼쪽 세로 방향에 무엇이 위아래로 쓰여 있나요? (학급)';
        if (!isQ3Correct) wrongMsg += '<br>- Q3 힌트: 가로 눈금이 0, 5, 10 순서로 되어 있고 격자는 2칸입니다. (5권)';
        if (!isQ4SameCorrect) wrongMsg += '<br>- Q4-1 힌트: 두 그래프 모두 막대의 길이가 대출한 책의 수를 나타내는 점은 변하지 않습니다.';
        if (!isQ4DiffCorrect) wrongMsg += '<br>- Q4-2 힌트: 가로와 세로가 나타내는 내용이 서로 바뀝니다.';
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

      const isQ1Correct = q1.value === '1'; // 1명
      const isQ2Correct = q2.value === '8'; // 8명

      if (isQ1Correct && isQ2Correct) {
        fb.innerHTML = '정답입니다! 🎉 세로 눈금 한 칸은 1명이며, 강아지를 좋아하는 학생은 8명입니다. 1단계를 완벽하게 학습했습니다!';
        fb.className = 'quiz-feedback success';
        fb.style.display = 'block';
        if (finishBtn) finishBtn.disabled = false;
        unlockNext(1); // 1단계 완료했으므로 2단계 잠금 해제
        playConfetti();
      } else {
        let wrongMsg = '틀린 문제가 있습니다. 다시 한번 읽어보세요. 😢';
        if (!isQ1Correct) wrongMsg += '<br>- Q1 힌트: 세로 눈금이 0, 1, 2, 3... 순서로 1씩 증가하고 있습니다. (1명)';
        if (!isQ2Correct) wrongMsg += '<br>- Q2 힌트: 강아지 막대의 맨 위 끝이 가리키는 왼쪽 세로 눈금의 숫자를 읽어보세요. (8명)';
        fb.innerHTML = wrongMsg;
        fb.className = 'quiz-feedback error';
        fb.style.display = 'block';
      }
    });
  }

  // 1차시 전용 완료 모달창 띄우기 함수
  function showSession1Completion() {
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
      <h2 style="color: var(--color-success); font-size: 2.2rem; font-weight: 900; margin-bottom: 15px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%;">
        <span>1차시 모험 클리어!</span>
        <button class="btn-tts modal-tts-btn" data-tts="축하합니다! 일차시 막대그래프의 약속 배우기 모험을 모두 성공적으로 마쳤습니다! 참 잘했습니다! 🚀" style="flex-shrink: 0;"></button>
      </h2>
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

    const ttsBtn = card.querySelector('.modal-tts-btn');
    if (ttsBtn) {
      ttsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        speakText(ttsBtn.getAttribute('data-tts'), ttsBtn);
      });
    }

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
      if (MAX_ENABLED_STEP === 1) {
        showSession1Completion();
      } else {
        showPanel(2);
        updateNavigationUI();
      }
    });
  }

  // 2차시 전용 완료 모달창 띄우기 함수
  function showSession2Completion() {
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
      <h2 style="color: var(--color-success); font-size: 2.2rem; font-weight: 900; margin-bottom: 15px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%;">
        <span>2차시 모험 클리어!</span>
        <button class="btn-tts modal-tts-btn" data-tts="축하합니다! 이차시 막대그래프 해석하기 모험을 모두 성공적으로 마쳤습니다! 참 잘했습니다! 🚀" style="flex-shrink: 0;"></button>
      </h2>
      <p style="font-size: 1.15rem; color: var(--color-text-main); font-weight: 700; margin-bottom: 10px;">
        \${state.studentName} 탐험가님, 막대그래프 분석 마스터 달성! 🏆
      </p>
      <p style="font-size: 1.05rem; color: var(--color-text-muted); line-height: 1.6; margin-bottom: 30px;">
        막대그래프의 방향에 따른 가로와 세로의 변화와 눈금 읽는 법을 완벽하게 이해하고 복잡한 비교 문제까지 훌륭하게 완수하셨습니다. 다음 시간에 더 재밌는 모험으로 만나요! 🥬🥛✨
      </p>
      <button id="btn-close-completion" class="btn btn-success btn-large" style="width: 100%;">
        완료하고 확인하기 ✔️
      </button>
    `;

    modal.appendChild(card);
    document.body.appendChild(modal);

    playConfetti();

    const ttsBtn = card.querySelector('.modal-tts-btn');
    if (ttsBtn) {
      ttsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        speakText(ttsBtn.getAttribute('data-tts'), ttsBtn);
      });
    }

    document.getElementById('btn-close-completion').addEventListener('click', () => {
      modal.style.animation = 'fade-out 0.3s ease forwards';
      setTimeout(() => {
        modal.remove();
      }, 300);
    });
  }

  // ==========================================
  // G. 2단계: 눈금 읽기 오개념 격파 (활동 2-1 ~ 2-3)
  // ==========================================

  // 활동 2-1: 환경 보호 활동 퀴즈 검사
  const btnCheckSub21 = document.getElementById('btn-check-sub21');
  if (btnCheckSub21) {
    btnCheckSub21.addEventListener('click', () => {
      const q1x = document.querySelector('input[name="q21_1_x"]:checked');
      const q1y = document.querySelector('input[name="q21_1_y"]:checked');
      const q2 = document.querySelector('input[name="q21_2"]:checked');
      const q3Bunri = document.querySelector('input[name="q21_3"][value="bunri"]').checked;
      const q3Gubsik = document.querySelector('input[name="q21_3"][value="gubsik"]').checked;
      const q3Yangchi = document.querySelector('input[name="q21_3"][value="yangchi"]').checked;
      const fb = document.getElementById('sub21-feedback');
      const nextBtn = document.getElementById('btn-go-to-22');

      if (!q1x || !q1y || !q2) {
        fb.textContent = '⚠️ 아직 답을 고르지 않은 라디오 문항이 있습니다.';
        fb.className = 'quiz-feedback error';
        fb.style.display = 'block';
        return;
      }

      const isQ1xCorrect = q1x.value === 'a'; // 가로: 실천 활동 종류
      const isQ1yCorrect = q1y.value === 'b'; // 세로: 학생 수 (명)
      const isQ2Correct = q2.value === '14'; // 14명
      const isQ3Correct = q3Bunri && !q3Gubsik && q3Yangchi; // 분리배출, 양치컵만 선택 (일회용품 10명보다 많은 것은 18명, 14명)

      if (isQ1xCorrect && isQ1yCorrect && isQ2Correct && isQ3Correct) {
        fb.innerHTML = '정답입니다! 🎉 세로 그래프를 정확하게 해석하셨습니다. 아래의 활동 2로 가기 버튼을 눌러주세요!';
        fb.className = 'quiz-feedback success';
        fb.style.display = 'block';
        if (nextBtn) nextBtn.disabled = false;
        playConfetti();
      } else {
        let wrongMsg = '틀린 문제가 있습니다. 다시 한번 읽어보세요. 😢';
        if (!isQ1xCorrect) wrongMsg += '<br>- Q1 힌트: 가로 바닥선에 적혀있는 글씨를 읽어보세요.';
        if (!isQ1yCorrect) wrongMsg += '<br>- Q2 힌트: 왼쪽 세로 높이선에 적혀있는 글씨를 읽어보세요.';
        if (!isQ2Correct) wrongMsg += '<br>- Q3 힌트: 양치 컵 막대의 맨 위 끝이 가리키는 왼쪽 세로 눈금의 숫자를 읽어보세요.';
        if (!isQ3Correct) wrongMsg += '<br>- Q4 힌트: 일회용 금지(10명)보다 수치가 더 높은 활동들을 모두 체크하세요. (분리배출 18명, 양치 컵 14명)';
        fb.innerHTML = wrongMsg;
        fb.className = 'quiz-feedback error';
        fb.style.display = 'block';
      }
    });
  }

  // 활동 2-1 -> 2-2 전환
  const btnGoTo22 = document.getElementById('btn-go-to-22');
  if (btnGoTo22) {
    btnGoTo22.addEventListener('click', () => {
      const sub21 = document.getElementById('sub-step-2-1');
      const sub22 = document.getElementById('sub-step-2-2');
      if (sub21) sub21.style.display = 'none';
      if (sub22) {
        sub22.style.display = 'block';
        sub22.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // 활동 2-2 -> 2-1 되돌아가기
  const btnBackTo21 = document.getElementById('btn-back-to-21');
  if (btnBackTo21) {
    btnBackTo21.addEventListener('click', () => {
      const sub21 = document.getElementById('sub-step-2-1');
      const sub22 = document.getElementById('sub-step-2-2');
      if (sub22) sub22.style.display = 'none';
      if (sub21) {
        sub21.style.display = 'block';
        sub21.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // 활동 2-2: 기르고 싶은 채소 퀴즈 검사
  const btnCheckSub22 = document.getElementById('btn-check-sub22');
  if (btnCheckSub22) {
    btnCheckSub22.addEventListener('click', () => {
      const q1 = document.querySelector('input[name="q22_1"]:checked');
      const q2 = document.querySelector('input[name="q22_2"]:checked');
      const q3 = document.querySelector('input[name="q22_3"]:checked');
      const fb = document.getElementById('sub22-feedback');
      const nextBtn = document.getElementById('btn-go-to-23');

      if (!q1 || !q2 || !q3) {
        fb.textContent = '⚠️ 아직 답을 고르지 않은 문항이 있습니다.';
        fb.className = 'quiz-feedback error';
        fb.style.display = 'block';
        return;
      }

      const isQ1Correct = q1.value === '10'; // 10명
      const isQ2Correct = q2.value === '70'; // 70명
      const isQ3Correct = q3.value === '30'; // 30명 (오이 80 - 호박 50)

      if (isQ1Correct && isQ2Correct && isQ3Correct) {
        fb.innerHTML = '정답입니다! 🎉 가로 그래프의 10단위 눈금과 항목 비교를 정확히 파악하셨습니다. 활동 3으로 가기 버튼을 눌러주세요!';
        fb.className = 'quiz-feedback success';
        fb.style.display = 'block';
        if (nextBtn) nextBtn.disabled = false;
        playConfetti();
      } else {
        let wrongMsg = '틀린 문제가 있습니다. 다시 한번 읽어보세요. 😢';
        if (!isQ1Correct) wrongMsg += '<br>- Q1 힌트: 바닥선의 0에서 50 사이를 나누는 5개의 큰 칸이 있습니다. 한 칸은 50 나누기 5입니다.';
        if (!isQ2Correct) wrongMsg += '<br>- Q2 힌트: 가지(🍆)의 가로 막대 끝이 바닥선의 어떤 숫자 눈금과 만나는지 확인해 보세요.';
        if (!isQ3Correct) wrongMsg += '<br>- Q3 힌트: 오이(80명)와 호박(50명)의 차이를 구하기 위해 80 - 50을 계산해 보세요.';
        fb.innerHTML = wrongMsg;
        fb.className = 'quiz-feedback error';
        fb.style.display = 'block';
      }
    });
  }

  // 활동 2-2 -> 2-3 전환
  const btnGoTo23 = document.getElementById('btn-go-to-23');
  if (btnGoTo23) {
    btnGoTo23.addEventListener('click', () => {
      const sub22 = document.getElementById('sub-step-2-2');
      const sub23 = document.getElementById('sub-step-2-3');
      if (sub22) sub22.style.display = 'none';
      if (sub23) {
        sub23.style.display = 'block';
        sub23.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // 활동 2-3 -> 2-2 되돌아가기
  const btnBackTo22 = document.getElementById('btn-back-to-22');
  if (btnBackTo22) {
    btnBackTo22.addEventListener('click', () => {
      const sub22 = document.getElementById('sub-step-2-2');
      const sub23 = document.getElementById('sub-step-2-3');
      if (sub23) sub23.style.display = 'none';
      if (sub22) {
        sub22.style.display = 'block';
        sub22.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // ==========================================
  // 활동 2-3: 질문 만들기 인터랙티브 로직
  // ==========================================
  let q3ActiveGraph = 'env'; // 'env' or 'veg'

  const ENV_ITEMS = [
    { name: '분리배출 ♻️', val: 18 },
    { name: '급식 잔반 🍱', val: 6 },
    { name: '양치 컵 🥛', val: 14 },
    { name: '일회용 금지 🛍️', val: 10 }
  ];

  const VEG_ITEMS = [
    { name: '방울토마토 🍅', val: 100 },
    { name: '상추 🥬', val: 90 },
    { name: '오이 🥒', val: 80 },
    { name: '가지 🍆', val: 70 },
    { name: '호박 🎃', val: 50 }
  ];

  function populateQ3Dropdowns() {
    const item1Select = document.getElementById('q3-compare-item1');
    const item2Select = document.getElementById('q3-compare-item2');
    const ansTextSelect = document.getElementById('q3-ans-text');
    if (!item1Select || !item2Select || !ansTextSelect) return;

    const items = q3ActiveGraph === 'env' ? ENV_ITEMS : VEG_ITEMS;

    // 옵션 초기화
    item1Select.innerHTML = '';
    item2Select.innerHTML = '';
    ansTextSelect.innerHTML = '';

    // 옵션 추가
    items.forEach(it => {
      const opt1 = document.createElement('option');
      opt1.value = it.name;
      opt1.textContent = it.name;
      item1Select.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = it.name;
      opt2.textContent = it.name;
      item2Select.appendChild(opt2);

      const optAns = document.createElement('option');
      optAns.value = it.name;
      optAns.textContent = it.name;
      ansTextSelect.appendChild(optAns);
    });

    // 기본 선택을 서로 다르게 배치
    if (items.length > 1) {
      item2Select.selectedIndex = 1;
    }
  }

  function setQ3Graph(graphType) {
    q3ActiveGraph = graphType;
    const btnEnv = document.getElementById('btn-toggle-graph-env');
    const btnVeg = document.getElementById('btn-toggle-graph-veg');
    const graphEnv = document.getElementById('compact-graph-env');
    const graphVeg = document.getElementById('compact-graph-veg');

    if (graphType === 'env') {
      if (btnEnv) {
        btnEnv.className = 'btn btn-primary btn-sm';
        btnEnv.classList.remove('btn-outline');
      }
      if (btnVeg) {
        btnVeg.className = 'btn btn-outline btn-sm';
        btnVeg.classList.remove('btn-primary');
      }
      if (graphEnv) graphEnv.style.display = 'block';
      if (graphVeg) graphVeg.style.display = 'none';
    } else {
      if (btnEnv) {
        btnEnv.className = 'btn btn-outline btn-sm';
        btnEnv.classList.remove('btn-primary');
      }
      if (btnVeg) {
        btnVeg.className = 'btn btn-primary btn-sm';
        btnVeg.classList.remove('btn-outline');
      }
      if (graphEnv) graphEnv.style.display = 'none';
      if (graphVeg) graphVeg.style.display = 'block';
    }

    populateQ3Dropdowns();
  }

  // 그래프 토글 바인딩
  const btnToggleEnv = document.getElementById('btn-toggle-graph-env');
  const btnToggleVeg = document.getElementById('btn-toggle-graph-veg');
  if (btnToggleEnv) {
    btnToggleEnv.addEventListener('click', () => setQ3Graph('env'));
  }
  if (btnToggleVeg) {
    btnToggleEnv.addEventListener('click', () => setQ3Graph('veg'));
  }

  // 템플릿 전환 라디오 이벤트 바인딩
  document.querySelectorAll('input[name="q3_temp_type"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const type = e.target.value;
      const boxCompare = document.getElementById('q3-builder-compare');
      const boxExtremes = document.getElementById('q3-builder-extremes');
      const ansCompare = document.getElementById('ans-input-compare-box');
      const ansExtreme = document.getElementById('ans-input-extreme-box');

      if (type === 'compare') {
        if (boxCompare) boxCompare.style.display = 'block';
        if (boxExtremes) boxExtremes.style.display = 'none';
        if (ansCompare) ansCompare.style.display = 'flex';
        if (ansExtreme) ansExtreme.style.display = 'none';
      } else {
        if (boxCompare) boxCompare.style.display = 'none';
        if (boxExtremes) boxExtremes.style.display = 'block';
        if (ansCompare) ansCompare.style.display = 'none';
        if (ansExtreme) ansExtreme.style.display = 'flex';
      }
    });
  });

  // TTS 생성용 문장 조합 헬퍼
  function getConstructedQuestionText() {
    const isCompare = document.querySelector('input[name="q3_temp_type"]:checked').value === 'compare';
    const graphName = q3ActiveGraph === 'env' ? '환경 보호 활동' : '텃밭 채소 기르기';
    
    if (isCompare) {
      const item1 = document.getElementById('q3-compare-item1').value;
      const item2 = document.getElementById('q3-compare-item2').value;
      const compTypeVal = document.getElementById('q3-compare-type').value;
      const compTypeText = compTypeVal === 'more' ? '몇 명 더 많을까요?' : '몇 명 더 적을까요?';
      return `${graphName} 막대그래프에서, ${item1}을 선택한 학생은 ${item2}을 선택한 학생보다 ${compTypeText}`;
    } else {
      const extremeTypeVal = document.getElementById('q3-extreme-type').value;
      const extremeTypeText = extremeTypeVal === 'max' ? '가장 많은' : '가장 적은';
      return `${graphName} 막대그래프에서, ${extremeTypeText} 학생이 선택한 항목은 무엇일까요?`;
    }
  }

  // TTS 재생 바인딩
  const btnSpeakQ3 = document.getElementById('btn-speak-my-question');
  if (btnSpeakQ3) {
    btnSpeakQ3.addEventListener('click', (e) => {
      e.stopPropagation();
      const text = getConstructedQuestionText();
      speakText(text, btnSpeakQ3);
    });
  }

  // 초기 로드 시 드롭다운 빌드
  populateQ3Dropdowns();

  // 질문 채점 검증 바인딩
  const btnCheckQ3 = document.getElementById('btn-check-q3');
  if (btnCheckQ3) {
    btnCheckQ3.addEventListener('click', () => {
      const isCompare = document.querySelector('input[name="q3_temp_type"]:checked').value === 'compare';
      const fb = document.getElementById('q3-feedback');
      const finishBtn = document.getElementById('btn-finish-step2');
      const items = q3ActiveGraph === 'env' ? ENV_ITEMS : VEG_ITEMS;

      if (isCompare) {
        const item1Name = document.getElementById('q3-compare-item1').value;
        const item2Name = document.getElementById('q3-compare-item2').value;
        const compareType = document.getElementById('q3-compare-type').value;
        const studentAnsRaw = document.getElementById('q3-ans-number').value.trim();

        if (item1Name === item2Name) {
          fb.textContent = '⚠️ 서로 다른 두 항목을 선택하여 비교해 보세요!';
          fb.className = 'quiz-feedback error';
          fb.style.display = 'block';
          return;
        }

        if (!studentAnsRaw) {
          fb.textContent = '⚠️ 계산한 정답 값을 숫자로 입력해 주세요!';
          fb.className = 'quiz-feedback error';
          fb.style.display = 'block';
          return;
        }

        const val1 = items.find(x => x.name === item1Name).val;
        const val2 = items.find(x => x.name === item2Name).val;
        const studentAns = parseInt(studentAnsRaw, 10);

        if (compareType === 'more') {
          if (val1 < val2) {
            fb.innerHTML = `⚠️ 질문의 논리가 맞지 않아요! <br><strong>${item1Name} (${val1}명)</strong>은 <strong>${item2Name} (${val2}명)</strong>보다 작기 때문에 '더 많을까요?'라고 질문할 수 없습니다. 두 항목의 순서를 바꾸거나 '더 적은가요?'로 변경해 보세요.`;
            fb.className = 'quiz-feedback error';
            fb.style.display = 'block';
            return;
          }
          const correctAns = val1 - val2;
          if (studentAns === correctAns) {
            fb.innerHTML = `정답입니다! 🎉<br><strong>${item1Name} (${val1}명)</strong>은 <strong>${item2Name} (${val2}명)</strong>보다 정확히 <strong>${correctAns}명</strong> 더 많습니다. 멋진 질문과 정확한 계산입니다! 짝에게 이 질문을 들려주고 맞춰보게 하세요.`;
            fb.className = 'quiz-feedback success';
            fb.style.display = 'block';
            if (finishBtn) finishBtn.disabled = false;
            unlockNext(2);
            playConfetti();
          } else {
            fb.innerHTML = `❌ 계산이 맞지 않아요. 다시 구해보세요.<br>힌트: ${item1Name}은 ${val1}명이고, ${item2Name}은 ${val2}명입니다. ${val1} - ${val2}을 다시 계산해 보세요!`;
            fb.className = 'quiz-feedback error';
            fb.style.display = 'block';
          }
        } else {
          // compareType === 'less'
          if (val1 > val2) {
            fb.innerHTML = `⚠️ 질문의 논리가 맞지 않아요! <br><strong>${item1Name} (${val1}명)</strong>은 <strong>${item2Name} (${val2}명)</strong>보다 크기 때문에 '더 적을까요?'라고 질문할 수 없습니다. 두 항목의 순서를 바꾸거나 '더 많은가요?'로 변경해 보세요.`;
            fb.className = 'quiz-feedback error';
            fb.style.display = 'block';
            return;
          }
          const correctAns = val2 - val1;
          if (studentAns === correctAns) {
            fb.innerHTML = `정답입니다! 🎉<br><strong>${item1Name} (${val1}명)</strong>은 <strong>${item2Name} (${val2}명)</strong>보다 정확히 <strong>${correctAns}명</strong> 더 적습니다. 멋진 질문과 정확한 계산입니다! 짝에게 이 질문을 들려주고 맞춰보게 하세요.`;
            fb.className = 'quiz-feedback success';
            fb.style.display = 'block';
            if (finishBtn) finishBtn.disabled = false;
            unlockNext(2);
            playConfetti();
          } else {
            fb.innerHTML = `❌ 계산이 맞지 않아요. 다시 구해보세요.<br>힌트: ${item1Name}은 ${val1}명이고, ${item2Name}은 ${val2}명입니다. ${val2} - ${val1}을 다시 계산해 보세요!`;
            fb.className = 'quiz-feedback error';
            fb.style.display = 'block';
          }
        }
      } else {
        // extremes
        const extremeType = document.getElementById('q3-extreme-type').value;
        const studentAnsText = document.getElementById('q3-ans-text').value;

        let correctItem;
        if (extremeType === 'max') {
          correctItem = [...items].sort((a, b) => b.val - a.val)[0];
        } else {
          correctItem = [...items].sort((a, b) => a.val - b.val)[0];
        }

        if (studentAnsText === correctItem.name) {
          fb.innerHTML = `정답입니다! 🎉<br>이 그래프에서 가장 ${extremeType === 'max' ? '많은 (🥇)' : '적은 (🥉)'} 학생이 선택한 항목은 정확하게 <strong>${correctItem.name} (${correctItem.val}명)</strong>입니다. 멋진 질문과 올바른 해석입니다!`;
          fb.className = 'quiz-feedback success';
          fb.style.display = 'block';
          if (finishBtn) finishBtn.disabled = false;
          unlockNext(2);
          playConfetti();
        } else {
          fb.innerHTML = `❌ 선택한 항목이 답과 맞지 않아요. 다시 그래프 막대의 길이를 확인해 보세요!<br>힌트: 가장 ${extremeType === 'max' ? '긴' : '짧은'} 막대의 이름을 찾아보세요.`;
          fb.className = 'quiz-feedback error';
          fb.style.display = 'block';
        }
      }
    });
  }

  // 2단계 클리어 후 3단계 패널 전환
  const btnFinishStep2 = document.getElementById('btn-finish-step2');
  if (btnFinishStep2) {
    btnFinishStep2.addEventListener('click', () => {
      if (MAX_ENABLED_STEP === 2) {
        showSession2Completion();
      } else {
        showPanel(3);
        updateNavigationUI();
      }
    });
  }

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

  const btnCheckDrawing = document.getElementById('btn-check-drawing');
  if (btnCheckDrawing) {
    btnCheckDrawing.addEventListener('click', () => {
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
  }

  const btnNextTo4 = document.getElementById('btn-next-to-4');
  if (btnNextTo4) {
    btnNextTo4.addEventListener('click', () => {
      showPanel(4);
      updateNavigationUI();
    });
  }

  // ==========================================
  // I. 4단계: 실시간 그래프 작성 및 모둠 릴레이
  // ==========================================
  const inputsWrap = document.getElementById('custom-inputs-list');

  const btnAddRow = document.getElementById('btn-add-row');
  if (btnAddRow) {
    btnAddRow.addEventListener('click', () => {
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
  }

  function bindInputs() {
    const titleIn = document.getElementById('step4-title');
    const unitIn = document.getElementById('step4-y-unit');
    if (!titleIn || !unitIn) return;

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
    if (!barWrap || !yScale || !yLabel) return;

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
  const btnSaveCustomGraph = document.getElementById('btn-save-custom-graph');
  if (btnSaveCustomGraph) {
    btnSaveCustomGraph.addEventListener('click', () => {
      const empty = state.customGraph.items.some(i => !i.name || i.name === '미지정');
      if (empty) {
        alert('항목 이름과 값을 모두 채워주세요!');
        return;
      }

      localStorage.setItem('barGraph_customGraph', JSON.stringify(state.customGraph));
      
      const fb = document.getElementById('step4-feedback');
      fb.textContent = '내 그래프가 저장되었습니다! 모둠 릴레이 활동으로 내려가세요. 💾';
      fb.className = 'quiz-feedback success';

      const relayBox = document.getElementById('modum-relay-section');
      relayBox.style.display = 'block';
      relayBox.scrollIntoView({ behavior: 'smooth' });
      playConfetti();
    });
  }

  // --- 모둠 릴레이 내부 로직 ---
  let activeReviewer = '';

  const btnStartReview = document.getElementById('btn-start-review');
  if (btnStartReview) {
    btnStartReview.addEventListener('click', () => {
      const nameInput = document.getElementById('relay-reviewer-name').value.trim();
      if (!nameInput) {
        alert('평가할 친구의 이름을 적어주세요!');
        return;
      }

      activeReviewer = nameInput;
      document.getElementById('active-reviewer-name').textContent = nameInput;

      document.getElementById('relay-setup-card').style.display = 'none';
      document.getElementById('relay-review-workspace').style.display = 'block';

      generateAIDynamicQuizzes();
    });
  }

  function generateAIDynamicQuizzes() {
    const container = document.getElementById('dynamic-relay-quizzes');
    if (!container) return;
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

  // 동료 평가 제출
  const btnSubmitReview = document.getElementById('btn-submit-review');
  if (btnSubmitReview) {
    btnSubmitReview.addEventListener('click', () => {
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
  }

  function renderReviewersChips() {
    const list = document.getElementById('completed-reviewers-list');
    if (!list) return;
    if (state.reviews.length === 0) {
      list.innerHTML = `<span class="no-reviewer-msg">아직 평가한 친구가 없습니다. 첫 번째 릴레이를 시작해보세요!</span>`;
      return;
    }

    list.innerHTML = state.reviews.map(r => `
      <span class="reviewer-chip-active">🎖️ ${r.reviewerName} 평가위원 (${r.isCorrect ? '퀴즈 만점 💯' : '퀴즈 완료'})</span>
    `).join('');

    if (state.reviews.length >= 2) {
      const certSection = document.getElementById('certificate-section');
      if (certSection) {
        certSection.style.display = 'block';
      }
    }
  }

  // 모둠 릴레이 세션 강제/완전 종료
  const btnEndRelayAll = document.getElementById('btn-end-relay-all');
  if (btnEndRelayAll) {
    btnEndRelayAll.addEventListener('click', () => {
      if (state.reviews.length < 2) {
        alert('최소 2명 이상의 모둠원 친구들이 평가를 진행해야 단원을 마무리할 수 있습니다! (3인 모둠인 경우 2명 이상 필수)');
        return;
      }
      alert('모둠 릴레이가 최종 종료되었습니다! 축하합니다! 아래에서 마스터 수료증을 확인해 보세요. 🏆');
      
      const certSection = document.getElementById('certificate-section');
      if (certSection) {
        certSection.style.display = 'block';
        renderCertificate();
        certSection.scrollIntoView({ behavior: 'smooth' });
      }
      playConfetti();
    });
  }

  const btnNextTo5 = document.getElementById('btn-next-to-5');
  if (btnNextTo5) {
    btnNextTo5.addEventListener('click', () => {
      unlockNext(4);
      showPanel(5);
      updateNavigationUI();
    });
  }

  // ==========================================
  // J. 5단계: 눈금 단위 크기 비교 학습 (물결선 배제 교과 적용)
  // ==========================================
  const btnCheckStep5 = document.getElementById('btn-check-step5');
  if (btnCheckStep5) {
    btnCheckStep5.addEventListener('click', () => {
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
  }

  const btnNextTo6 = document.getElementById('btn-next-to-6');
  if (btnNextTo6) {
    btnNextTo6.addEventListener('click', () => {
      showPanel(6);
      updateNavigationUI();
    });
  }

  // ==========================================
  // K. 6단계: 수료증 및 모둠 칭찬 목록 출력
  // ==========================================
  function renderCertificate() {
    const certSection = document.getElementById('certificate-section');
    if (certSection) {
      if (state.reviews.length >= 2) {
        certSection.style.display = 'block';
      } else {
        certSection.style.display = 'none';
      }
    }

    document.getElementById('cert-name-label').textContent = state.studentName;
    document.getElementById('cert-portfolio-title').textContent = state.customGraph.title;

    const today = new Date();
    document.getElementById('cert-date-display').textContent = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

    // 1. 미니 맵 그리기
    const chartWrap = document.getElementById('cert-mini-chart-wrapper');
    if (chartWrap) {
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
    }

    // 2. 모둠원 코멘트 게시판 렌더링
    const commList = document.getElementById('cert-comments-list');
    if (commList) {
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
  }

  const btnPrintCert = document.getElementById('btn-print-cert');
  if (btnPrintCert) {
    btnPrintCert.addEventListener('click', () => {
      window.print();
    });
  }

  const btnRestartAdventure = document.getElementById('btn-restart-adventure');
  if (btnRestartAdventure) {
    btnRestartAdventure.addEventListener('click', () => {
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

        document.getElementById('student-name-input').value = '';
        const step4Title = document.getElementById('step4-title');
        if (step4Title) step4Title.value = state.customGraph.title;
        const step4YUnit = document.getElementById('step4-y-unit');
        if (step4YUnit) step4YUnit.value = state.customGraph.unit;

        document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
        document.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
        document.querySelectorAll('.quiz-feedback').forEach(fb => {
          fb.style.display = 'none';
          fb.textContent = '';
        });

        // UI 초기 상태화
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

        const readingWrapper = document.getElementById('reading-challenge-wrapper');
        if (readingWrapper) readingWrapper.classList.add('locked-chart');
        const btnCheck2 = document.getElementById('btn-check-step2');
        if (btnCheck2) btnCheck2.disabled = true;
        const trapBox = document.getElementById('bar-length-trap-box');
        if (trapBox) trapBox.style.display = 'none';

        const certSection = document.getElementById('certificate-section');
        if (certSection) certSection.style.display = 'none';
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
  }

  // ==========================================
  // L. 폭죽 파티클 애니메이션 엔진
  // ==========================================
  const canvas = document.getElementById('confetti-canvas');
  if (canvas) {
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

    window.playConfetti = function() {
      for (let i = 0; i < 110; i++) {
        particles.push(new Particle());
      }
      if (particles.length === 110) {
        loop();
      }
    }
    
    // playConfetti 글로벌 바인딩
    window.playConfetti = playConfetti;
  } else {
    window.playConfetti = function() {};
  }
  
  // playConfetti 로컬 대체
  const playConfetti = window.playConfetti;

  // ==========================================
  // M. 초기 로딩 구동
  // ==========================================
  loadProgress();
  bindInputs();
  updateDrawingUI();

});