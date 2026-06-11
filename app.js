/* ==========================================
   우당탕탕 막대그래프 대모험 - 핵심 로직 JS (최종본)
   [초등학교 교육용 자료 개발 프로젝트]
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
  try {
    window.APP_JS_LOADED = true;
    
    // 수업 차시 제어: 1 = 1차시만, 2 = 2차시까지, 3 = 3차시(3단계)까지, 5 = 5단계까지(6단계 잠금)
    const MAX_ENABLED_STEP = 5;
  
    function stripEmoji(str) {
      if (!str) return '';
      return str.replace(/[^가-힣a-zA-Z0-9\(\)\s]/g, '').trim();
    }
  
  // ==========================================
  // A. 상태 관리 객체 (State Management)
  // ==========================================
  const state = {
    studentName: '',
    currentStep: 0,       // 현재 단계 (0~6)
    unlockedStep: 1,      // 열린 최고 단계 (1~6)
    activeScale31: 1,     // 3-1단계의 활성 눈금 크기 (1, 2, 5)
    step5Act1Cleared: false,
    step5Act2Cleared: false,
    step5Act3Cleared: false,
    drawing31Data: {
      chopsticks: 0,
      cup: 0,
      bag: 0,
      spoon: 0
    },
    drawing31DataByScale: {
      1: { chopsticks: 0, cup: 0, bag: 0, spoon: 0 },
      2: { chopsticks: 8, cup: 12, bag: 6, spoon: 2 }, // 2와 5는 완품 데이터를 기본 제공하여 즉시 비교할 수 있도록 유도
      5: { chopsticks: 8, cup: 12, bag: 6, spoon: 2 }
    },
    drawing32Data: {
      chopsticks: 0,
      cup: 0,
      bag: 0,
      spoon: 0
    },
    drawing33Data: {
      chopsticks: 0,
      cup: 0,
      bag: 0,
      spoon: 0
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

  // 정답 테이블 (일회용품 개수)
  const TARGET_DRAWING_3 = {
    chopsticks: 8,
    cup: 12,
    bag: 6,
    spoon: 2
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
    try {
      window.LOAD_PROGRESS_CALLED = true;
      const savedCustom = localStorage.getItem('barGraph_customGraph');
      const savedReviews = localStorage.getItem('barGraph_reviews');

      if (window.IS_DEV_MODE) {
        // 개발자 모드일 경우: 기존 로컬스토리지에 저장된 탐험가 세션과 무관하게 항상 깨끗한 '테스터' 모드로 시작
        state.studentName = '테스터';
        const nameDisp = document.getElementById('student-name-display');
        const certName = document.getElementById('cert-name-label');
        if (nameDisp) nameDisp.textContent = `테스터 탐험가`;
        if (certName) certName.textContent = '테스터';
        state.unlockedStep = 6;
        state.currentStep = 1;
        showPanel(1);
        updateNavigationUI();
      } else {
        // 일반 사용자 모드일 경우: 로컬스토리지를 정상적으로 불러옴
        const savedName = localStorage.getItem('barGraph_studentName');
        const savedUnlocked = localStorage.getItem('barGraph_unlockedStep');
        
        if (savedName) {
          state.studentName = savedName;
          const nameDisp = document.getElementById('student-name-display');
          const certName = document.getElementById('cert-name-label');
          if (nameDisp) nameDisp.textContent = `${savedName} 탐험가`;
          if (certName) certName.textContent = savedName;
          
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
      }

      if (savedCustom) {
        state.customGraph = JSON.parse(savedCustom);
      }
      if (savedReviews) {
        state.reviews = JSON.parse(savedReviews);
        if (typeof renderReviewersChips === 'function') {
          renderReviewersChips();
        }
      }

      // 개발자 모드일 경우 대시보드 로드
      if (window.IS_DEV_MODE) {
        createDevPanel();
      }
    } catch (e) {
      console.error("loadProgress 중 오류 발생:", e);
      if (window.IS_DEV_MODE) {
        alert("loadProgress 실행 중 오류가 발생했습니다: " + e.message + "\n자세한 내용은 콘솔을 확인하세요.");
      }
    }
  }

  // ==========================================
  // Developer Test Console (Dev Console)
  // ==========================================
  function createDevPanel() {
    try {
      window.DEV_PANEL_CREATED = true;
      const devBox = document.createElement('div');
      devBox.id = 'dev-control-panel';
      devBox.style.position = 'fixed';
      devBox.style.bottom = '20px';
      devBox.style.right = '20px';
      devBox.style.background = 'rgba(15, 23, 42, 0.9)';
      devBox.style.backdropFilter = 'blur(8px)';
      devBox.style.color = '#f8fafc';
      devBox.style.padding = '15px';
      devBox.style.borderRadius = '12px';
      devBox.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
      devBox.style.zIndex = '99999';
      devBox.style.fontFamily = 'sans-serif';
      devBox.style.fontSize = '0.85rem';
      devBox.style.maxWidth = '300px';

      devBox.innerHTML = `
        <div style="font-weight: 800; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #475569; padding-bottom: 5px;">
          <span>🛠️ 개발자 테스트 도구</span>
          <button id="btn-toggle-dev" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:1.1rem;">➖</button>
        </div>
        <div id="dev-panel-content">
          <div style="margin-bottom: 10px;">
            <strong>단계 바로가기:</strong>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; margin-top: 5px;">
              <button class="btn-dev-jump" data-step="0">0단계</button>
              <button class="btn-dev-jump" data-step="1">1단계</button>
              <button class="btn-dev-jump" data-step="2">2단계</button>
              <button class="btn-dev-jump" data-step="3" data-sub="1">3-1</button>
              <button class="btn-dev-jump" data-step="3" data-sub="2">3-2</button>
              <button class="btn-dev-jump" data-step="3" data-sub="3">3-3</button>
              <button class="btn-dev-jump" data-step="4">4단계</button>
              <button class="btn-dev-jump" data-step="5">5단계</button>
              <button class="btn-dev-jump" data-step="6">6단계</button>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; margin-top: 10px;">
            <button id="btn-dev-unlock-all" style="width:100%; padding: 6px; background:#16a34a; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">🔓 모든 단계 잠금해제</button>
            <button id="btn-dev-solve-current" style="width:100%; padding: 6px; background:#0284c7; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">🎯 현재 단계 정답 자동완성</button>
            <button id="btn-dev-clear-local" style="width:100%; padding: 6px; background:#dc2626; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">🗑️ 데이터 초기화 (Reset)</button>
          </div>
        </div>
      `;

      document.body.appendChild(devBox);

      // Style dev buttons
      const styleButtons = () => {
        devBox.querySelectorAll('button:not(#btn-dev-unlock-all):not(#btn-dev-solve-current):not(#btn-dev-clear-local)').forEach(btn => {
          btn.style.background = '#334155';
          btn.style.color = '#f8fafc';
          btn.style.border = '1px solid #475569';
          btn.style.borderRadius = '4px';
          btn.style.padding = '4px 2px';
          btn.style.cursor = 'pointer';
          btn.style.fontSize = '0.75rem';
          btn.style.fontWeight = 'bold';
        });
      };
      styleButtons();

      // Toggle minimize
      let minimized = false;
      const btnToggle = devBox.querySelector('#btn-toggle-dev');
      const panelContent = devBox.querySelector('#dev-panel-content');
      if (btnToggle && panelContent) {
        btnToggle.addEventListener('click', () => {
          minimized = !minimized;
          panelContent.style.display = minimized ? 'none' : 'block';
          btnToggle.textContent = minimized ? '➕' : '➖';
        });
      }

      // Jump steps
      devBox.querySelectorAll('.btn-dev-jump').forEach(btn => {
        btn.addEventListener('click', () => {
          const step = parseInt(btn.getAttribute('data-step'), 10);
          const sub = btn.getAttribute('data-sub');
          
          // Ensure student name is set to navigate
          if (!state.studentName) {
            state.studentName = '테스터';
            const nameDisp = document.getElementById('student-name-display');
            const certName = document.getElementById('cert-name-label');
            if (nameDisp) nameDisp.textContent = `테스터 탐험가`;
            if (certName) certName.textContent = '테스터';
          }

          // Unlock up to this step
          if (state.unlockedStep < step) {
            state.unlockedStep = step;
          }
          
          showPanel(step);
          updateNavigationUI();

          // Handle sub steps in step 3
          if (step === 3 && sub) {
            const sub31 = document.getElementById('sub-step-3-1');
            const sub32 = document.getElementById('sub-step-3-2');
            const sub33 = document.getElementById('sub-step-3-3');
            if (sub31) sub31.style.display = 'none';
            if (sub32) sub32.style.display = 'none';
            if (sub33) sub33.style.display = 'none';
            
            const targetSub = document.getElementById(`sub-step-3-${sub}`);
            if (targetSub) {
              targetSub.style.display = 'block';
              targetSub.scrollIntoView({ behavior: 'smooth' });
            }

            if (sub === '1') update31DrawingUI();
            if (sub === '2') update32DrawingUI();
            if (sub === '3') update33DrawingUI();
          }
        });
      });

      // Unlock All
      const btnUnlockAll = devBox.querySelector('#btn-dev-unlock-all');
      if (btnUnlockAll) {
        btnUnlockAll.addEventListener('click', () => {
          state.studentName = state.studentName || '테스터';
          const nameDisp = document.getElementById('student-name-display');
          if (nameDisp) nameDisp.textContent = `${state.studentName} 탐험가`;
          state.unlockedStep = 6;
          updateNavigationUI();
          alert('모든 단계가 해제되었습니다! 네비게이션 바를 통해 자유롭게 이동하세요. 🔓');
        });
      }

      // Solve Current
      const btnSolveCurrent = devBox.querySelector('#btn-dev-solve-current');
      if (btnSolveCurrent) {
        btnSolveCurrent.addEventListener('click', () => {
          if (state.currentStep === 1) {
            const sub11 = document.getElementById('sub-step-1-1');
            const sub12 = document.getElementById('sub-step-1-2');
            const sub13 = document.getElementById('sub-step-1-3');
            const sub14 = document.getElementById('sub-step-1-4');

            if (sub11 && sub11.style.display !== 'none') {
              document.querySelectorAll('input[name="q11_1"][value="a"]').forEach(r => r.checked = true);
              document.querySelectorAll('input[name="q11_2"][value="b"]').forEach(r => r.checked = true);
              document.querySelectorAll('input[name="q11_3"][value="b"]').forEach(r => r.checked = true);
              document.querySelectorAll('input[name="q11_4"][value="1"]').forEach(r => r.checked = true);
              const check11 = document.getElementById('btn-check-sub11');
              if (check11) check11.click();
            } else if (sub12 && sub12.style.display !== 'none') {
              document.querySelectorAll('input[name="q12_1"][value="b"]').forEach(r => r.checked = true);
              document.querySelectorAll('input[name="q12_2"][value="a"]').forEach(r => r.checked = true);
              document.querySelectorAll('input[name="q12_3"][value="5"]').forEach(r => r.checked = true);
              document.querySelectorAll('input[name="q12_4_same"][value="a"]').forEach(r => r.checked = true);
              document.querySelectorAll('input[name="q12_4_diff"][value="b"]').forEach(r => r.checked = true);
              const check12 = document.getElementById('btn-check-sub12');
              if (check12) check12.click();
            } else if (sub13 && sub13.style.display !== 'none') {
              document.querySelectorAll('input[name="q13_1"][value="table"]').forEach(r => r.checked = true);
              document.querySelectorAll('input[name="q13_2"][value="graph"]').forEach(r => r.checked = true);
              const check13 = document.getElementById('btn-check-sub13');
              if (check13) check13.click();
            } else if (sub14 && sub14.style.display !== 'none') {
              document.querySelectorAll('input[name="q14_1"][value="1"]').forEach(r => r.checked = true);
              document.querySelectorAll('input[name="q14_2"][value="8"]').forEach(r => r.checked = true);
              const check14 = document.getElementById('btn-check-sub14');
              if (check14) check14.click();
            }
          } else if (state.currentStep === 2) {
            const sub21 = document.getElementById('sub-step-2-1');
            const sub22 = document.getElementById('sub-step-2-2');
            const sub23 = document.getElementById('sub-step-2-3');

            if (sub21 && sub21.style.display !== 'none') {
              document.querySelectorAll('input[name="q21_1_x"][value="a"]').forEach(r => r.checked = true);
              document.querySelectorAll('input[name="q21_1_y"][value="b"]').forEach(r => r.checked = true);
              document.querySelectorAll('input[name="q21_2"][value="14"]').forEach(r => r.checked = true);
              document.querySelectorAll('input[name="q21_3"][value="bunri"]').forEach(c => c.checked = true);
              document.querySelectorAll('input[name="q21_3"][value="yangchi"]').forEach(c => c.checked = true);
              document.querySelectorAll('input[name="q21_3"][value="gubsik"]').forEach(c => c.checked = false);
              const check21 = document.getElementById('btn-check-sub21');
              if (check21) check21.click();
            } else if (sub22 && sub22.style.display !== 'none') {
              document.querySelectorAll('input[name="q22_1"][value="10"]').forEach(r => r.checked = true);
              document.querySelectorAll('input[name="q22_2"][value="70"]').forEach(r => r.checked = true);
              document.querySelectorAll('input[name="q22_3"][value="30"]').forEach(r => r.checked = true);
              const check22 = document.getElementById('btn-check-sub22');
              if (check22) check22.click();
            } else if (sub23 && sub23.style.display !== 'none') {
              const isCompareInput = document.querySelector('input[name="q3_temp_type"]:checked');
              const isCompare = isCompareInput ? isCompareInput.value === 'compare' : true;
              if (isCompare) {
                const item1 = document.getElementById('q3-compare-item1');
                const item2 = document.getElementById('q3-compare-item2');
                const compType = document.getElementById('q3-compare-type');
                const ansNum = document.getElementById('q3-ans-number');
                if (item1) item1.selectedIndex = 0;
                if (item2) item2.selectedIndex = 1;
                if (compType) compType.value = 'more';
                
                const items = q3ActiveGraph === 'env' ? ENV_ITEMS : VEG_ITEMS;
                const diff = items[0].val - items[1].val;
                if (ansNum) ansNum.value = diff;
              } else {
                const extType = document.getElementById('q3-extreme-type');
                const ansTxt = document.getElementById('q3-ans-text');
                if (extType) extType.value = 'max';
                const items = q3ActiveGraph === 'env' ? ENV_ITEMS : VEG_ITEMS;
                const sorted = [...items].sort((a,b) => b.val - a.val);
                if (ansTxt) ansTxt.value = sorted[0].name;
              }
              const checkQ3 = document.getElementById('btn-check-q3');
              if (checkQ3) checkQ3.click();
            }
          } else if (state.currentStep === 3) {
            const sub31 = document.getElementById('sub-step-3-1');
            const sub32 = document.getElementById('sub-step-3-2');
            const sub33 = document.getElementById('sub-step-3-3');

            if (sub31 && sub31.style.display !== 'none') {
              state.drawing31Data.chopsticks = 8;
              state.drawing31Data.cup = 8;
              state.drawing31Data.bag = 6;
              state.drawing31Data.spoon = 2;
              state.drawing31DataByScale[1].chopsticks = 8;
              state.drawing31DataByScale[1].cup = 8;
              state.drawing31DataByScale[1].bag = 6;
              state.drawing31DataByScale[1].spoon = 2;
              update31DrawingUI();
              const warn31 = document.getElementById('warning-31');
              const quiz31 = document.getElementById('quiz-31');
              if (warn31) warn31.style.display = 'block';
              if (quiz31) quiz31.style.display = 'block';
              document.querySelectorAll('input[name="q31"][value="2"]').forEach(r => r.checked = true);
              const checkQ31 = document.getElementById('btn-check-q31');
              if (checkQ31) checkQ31.click();
            } else if (sub32 && sub32.style.display !== 'none') {
              state.drawing32Data.chopsticks = 8;
              state.drawing32Data.cup = 12;
              state.drawing32Data.bag = 6;
              state.drawing32Data.spoon = 2;
              update32DrawingUI();
              const checkDraw32 = document.getElementById('btn-check-drawing-32');
              if (checkDraw32) checkDraw32.click();
            } else if (sub33 && sub33.style.display !== 'none') {
              state.drawing33Data.chopsticks = 8;
              state.drawing33Data.cup = 12;
              state.drawing33Data.bag = 6;
              state.drawing33Data.spoon = 2;
              update33DrawingUI();
              const checkDraw33 = document.getElementById('btn-check-drawing-33');
              if (checkDraw33) checkDraw33.click();
            }
          } else if (state.currentStep === 5) {
            // 활동 5-1 정답 채우기 및 클릭
            const q1_2020 = document.querySelector('input[name="q51_1"][value="2020"]');
            const q2_2020 = document.querySelector('input[name="q51_2"][value="2020"]');
            const q3_b = document.querySelector('input[name="q51_3"][value="b"]');
            const q4_dec = document.querySelector('input[name="q51_4"][value="decrease"]');
            if (q1_2020) q1_2020.checked = true;
            if (q2_2020) q2_2020.checked = true;
            if (q3_b) q3_b.checked = true;
            if (q4_dec) q4_dec.checked = true;
            const checkAct5_1 = document.getElementById('btn-check-act5-1');
            if (checkAct5_1) checkAct5_1.click();

            // 활동 5-2 정답 채우기 및 클릭
            const sel1 = document.getElementById('act52-select-1');
            const sel2 = document.getElementById('act52-select-2');
            const sel3 = document.getElementById('act52-select-3');
            const sel4 = document.getElementById('act52-select-4');
            const sel5 = document.getElementById('act52-select-5');
            if (sel1) sel1.value = 'parking';
            if (sel2) sel2.value = 'garbage';
            if (sel3) sel3.value = 'safety';
            if (sel4) sel4.value = '40';
            if (sel5) sel5.value = 'noise';
            const checkAct5_2 = document.getElementById('btn-check-act5-2');
            if (checkAct5_2) checkAct5_2.click();

            // 활동 5-3 정답 채우기 및 클릭
            const q3_1_ans = document.querySelector('input[name="q53_1"][value="143680"]');
            const q3_2_ans = document.querySelector('input[name="q53_2"][value="b"]');
            if (q3_1_ans) q3_1_ans.checked = true;
            if (q3_2_ans) q3_2_ans.checked = true;
            const checkAct5_3 = document.getElementById('btn-check-act5-3');
            if (checkAct5_3) checkAct5_3.click();
          } else {
            alert('이 단계는 자동완성할 수 있는 퀴즈가 없습니다. 😊');
          }
        });
      }

      // Clear Local
      const btnClearLocal = devBox.querySelector('#btn-dev-clear-local');
      if (btnClearLocal) {
        btnClearLocal.addEventListener('click', () => {
          if (confirm('모든 데이터와 세션을 초기화할까요?')) {
            localStorage.clear();
            window.location.reload();
          }
        });
      }
    } catch (e) {
      console.error("createDevPanel 중 오류 발생:", e);
      if (window.IS_DEV_MODE) {
        alert("createDevPanel 실행 중 오류가 발생했습니다: " + e.message);
      }
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
    if (stepNum === 6 && !window.IS_DEV_MODE && (!state.step5Act1Cleared || !state.step5Act2Cleared || !state.step5Act3Cleared)) {
      alert("5단계를 모두 완료해야 6단계로 갈 수 있어요! 😊");
      return;
    }

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
    if (btn2) {
      if (MAX_ENABLED_STEP < 2) btn2.style.display = 'none';
      else {
        btn2.style.display = '';
        btn2.disabled = state.unlockedStep < 2;
      }
    }

    const btn3 = document.getElementById('btn-next-to-3');
    if (btn3) {
      if (MAX_ENABLED_STEP < 3) btn3.style.display = 'none';
      else {
        btn3.style.display = '';
        btn3.disabled = state.unlockedStep < 3;
      }
    }

    const btn4 = document.getElementById('btn-next-to-4');
    if (btn4) {
      if (MAX_ENABLED_STEP < 4) btn4.style.display = 'none';
      else {
        btn4.style.display = '';
        btn4.disabled = state.unlockedStep < 4;
      }
    }

    const btn5 = document.getElementById('btn-next-to-5');
    if (btn5) {
      if (MAX_ENABLED_STEP < 5) btn5.style.display = 'none';
      else {
        btn5.style.display = '';
        btn5.disabled = state.unlockedStep < 5;
      }
    }

    const btn6 = document.getElementById('btn-next-to-6');
    if (btn6) {
      if (MAX_ENABLED_STEP < 6) btn6.style.display = 'none';
      else {
        btn6.style.display = '';
        btn6.disabled = state.unlockedStep < 6;
      }
    }
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
        if (!isQ3Correct) wrongMsg += '<br>- Q3 힌트: 막대의 길이는 조사한 수의 크기를 나타냅니다.';
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

  // 활동 1-2: 가로 막대그래프 가로세로 전환 퀴즈 검사
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
        fb.innerHTML = '정답입니다! 🎉 가로 막대그래프에서는 가로는 대출한 책의 수(권), 세로는 학급(반)을 나타냅니다. 가로 눈금 한 칸은 5권이며, 두 그래프는 나타내는 수는 같으나 가로와 세로의 위치와 막대의 방향이 바뀝니다. 활동 3으로 가기 버튼을 눌러주세요!';
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
        fb.innerHTML = '정답입니다! 🎉 표는 정확한 합계와 수치를 알기 쉽고, 막대그래프는 크기를 한눈에 비교하기 편리하다는 각각의 매력이 있습니다. 마무리 연습 문제로 가보세요!';
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
  // H. 3단계: 그래프 그리기 조작 및 실시간 채점 피드백 (개편)
  // ==========================================
  function update31DrawingUI() {
    update31GraphVisualScale(state.activeScale31);
  }

  function updateScaleInstructionHelper(unit) {
    const helperBox = document.getElementById('scale-31-helper-box');
    if (!helperBox) return;
    
    helperBox.style.display = 'block';
    
    if (unit === 1) {
      helperBox.className = 'info-box mt-4 scale-helper-1';
      helperBox.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:1.5rem;">💡</span>
          <div>
            <strong>눈금 한 칸 = 1개</strong>일 때:<br>
            나무젓가락(8개)은 그릴 수 있지만, <strong>일회용 컵(12개)</strong>은 눈금 수가 부족해서(최대 8개) 더 이상 나타낼 수 없어요! ❌
          </div>
        </div>
      `;
    } else if (unit === 2) {
      helperBox.className = 'info-box mt-4 scale-helper-2';
      helperBox.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:1.5rem;">🎯</span>
          <div>
            <strong>눈금 한 칸 = 2개</strong>일 때:<br>
            나무젓가락(8개), 일회용 컵(12개), 비닐봉지(6개), 숟가락(2개) 모두 2의 배수이기 때문에 막대 끝이 <strong>눈금선에 정확히 일치(🎯)</strong>합니다! 값을 나타내거나 알아보기 아주 편리합니다.
          </div>
        </div>
      `;
    } else if (unit === 5) {
      helperBox.className = 'info-box mt-4 scale-helper-5';
      helperBox.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:1.5rem;">⚠️</span>
          <div>
            <strong>눈금 한 칸 = 5개</strong>일 때:<br>
            모든 개수(8, 12, 6, 2)가 5의 배수가 아니기 때문에 <strong>막대 끝이 눈금선 사이에 어정쩡하게 걸쳐 있습니다(⚠️).</strong> 또한 막대 높이가 너무 짧아져 값의 비교가 어렵고, 눈금을 정확히 읽기 매우 불편합니다!
          </div>
        </div>
      `;
    }
  }

  function update31GraphVisualScale(unit) {
    state.activeScale31 = unit;
    const maxVal = unit * 8;
    const items = ['chopsticks', 'cup', 'bag', 'spoon'];
    const values = state.drawing31DataByScale[unit];
    
    items.forEach(item => {
      const val = values[item];
      const bar = document.getElementById(`bar-31-${item}`);
      const cell = document.querySelector(`.target-cell-31[data-target="${item}"]`);
      
      if (bar) {
        const pct = (val / maxVal) * 100;
        bar.style.height = `${pct}%`;
        const hint = bar.querySelector('.bar-val-hint');
        
        // Remove all scale/highlight classes
        bar.classList.remove('aligned-bar', 'floating-bar', 'show-guideline', 'correct-height');
        if (cell) cell.classList.remove('success-cell');
        
        if (hint) {
          if (unit === 1) {
            hint.textContent = `${val}개`;
            // 원래 3-1 그리기 규칙 적용
            const target = TARGET_DRAWING_3[item];
            if (item !== 'cup' && val === target) {
              bar.classList.add('correct-height');
              if (cell) cell.classList.add('success-cell');
            }
          } else {
            // 눈금 2 또는 5 시연 상태
            bar.classList.add('show-guideline');
            const isAligned = (val % unit === 0);
            
            if (isAligned) {
              bar.classList.add('aligned-bar');
              hint.innerHTML = `${val}개 <span class="align-badge align-ok">🎯</span>`;
            } else {
              bar.classList.add('floating-bar');
              hint.innerHTML = `${val}개 <span class="align-badge align-fail">⚠️</span>`;
            }
          }
        }
      }
    });

    updateScaleInstructionHelper(unit);
  }

  function update32DrawingUI() {
    Object.keys(state.drawing32Data).forEach(item => {
      const val = state.drawing32Data[item];
      const target = TARGET_DRAWING_3[item];
      const bar = document.getElementById(`bar-32-${item}`);
      const cell = document.querySelector(`.target-cell-32[data-target="${item}"]`);

      if (bar) {
        const pct = (val / 16) * 100;
        bar.style.height = `${pct}%`;
        const hint = bar.querySelector('.bar-val-hint');
        if (hint) {
          hint.textContent = `${val}개`;
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

  function update33DrawingUI() {
    Object.keys(state.drawing33Data).forEach(item => {
      const val = state.drawing33Data[item];
      const target = TARGET_DRAWING_3[item];
      const bar = document.getElementById(`bar-33-${item}`);
      const cell = document.querySelector(`.target-cell-33[data-target="${item}"]`);

      if (bar) {
        const pct = (val / 16) * 100;
        bar.style.width = `${pct}%`;
        const hint = bar.querySelector('.bar-val-hint');
        if (hint) {
          hint.textContent = `${val}개`;
        }

        if (val === target) {
          bar.classList.add('correct-width');
          if (cell) cell.classList.add('success-cell');
        } else {
          bar.classList.remove('correct-width');
          if (cell) cell.classList.remove('success-cell');
        }
      }
    });
  }

  // 3-1 조작 버튼 클릭 핸들러
  document.querySelectorAll('.btn-adjust-31').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.getAttribute('data-item');
      const isUp = btn.classList.contains('btn-up');
      const unit = state.activeScale31;
      let val = state.drawing31DataByScale[unit][item];
      const maxLimit = unit * 8;

      if (isUp) {
        if (unit === 1) {
          if (item === 'cup') {
            if (val >= 8) {
              document.getElementById('warning-31').style.display = 'block';
              document.getElementById('quiz-31').style.display = 'block';
              update31GraphVisualScale(1); // 가이드 박스 표시를 위해 갱신
              document.getElementById('warning-31').scrollIntoView({ behavior: 'smooth' });
              return;
            }
          }
          if (val < maxLimit) val++;
          if (item === 'cup' && val === 8) {
            document.getElementById('warning-31').style.display = 'block';
            document.getElementById('quiz-31').style.display = 'block';
            update31GraphVisualScale(1); // 가이드 박스 표시를 위해 갱신
            document.getElementById('warning-31').scrollIntoView({ behavior: 'smooth' });
          }
        } else {
          if (val < maxLimit) val++;
        }
      } else {
        if (val > 0) val--;
      }

      state.drawing31DataByScale[unit][item] = val;
      if (unit === 1) {
        state.drawing31Data[item] = val;
      }
      update31DrawingUI();
    });
  });

  // 3-2 조작 버튼 클릭 핸들러
  document.querySelectorAll('.btn-adjust-32').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.getAttribute('data-item');
      const isUp = btn.classList.contains('btn-up');
      let val = state.drawing32Data[item];

      if (isUp) {
        if (val < 16) val += 2;
      } else {
        if (val > 0) val -= 2;
      }

      state.drawing32Data[item] = val;
      update32DrawingUI();
    });
  });

  // 3-3 조작 버튼 클릭 핸들러
  document.querySelectorAll('.btn-adjust-33').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.getAttribute('data-item');
      const isUp = btn.classList.contains('btn-up');
      let val = state.drawing33Data[item];

      if (isUp) {
        if (val < 16) val += 2;
      } else {
        if (val > 0) val -= 2;
      }

      state.drawing33Data[item] = val;
      update33DrawingUI();
    });
  });

  // 3-1 퀴즈 라디오 선택 변경 시 그래프 미리보기 업데이트
  document.querySelectorAll('input[name="q31"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const val = radio.value;
      const scaleLabels = document.querySelector('#sub-step-3-1 .y-scale-labels-drawing');
      if (val === '2') {
        if (scaleLabels) {
          scaleLabels.innerHTML = '<div>16</div><div>14</div><div>12</div><div>10</div><div>8</div><div>6</div><div>4</div><div>2</div><div>0</div>';
        }
        update31GraphVisualScale(2);
      } else if (val === '5') {
        if (scaleLabels) {
          scaleLabels.innerHTML = '<div>40</div><div>35</div><div>30</div><div>25</div><div>20</div><div>15</div><div>10</div><div>5</div><div>0</div>';
        }
        update31GraphVisualScale(5);
      } else {
        if (scaleLabels) {
          scaleLabels.innerHTML = '<div>8</div><div>7</div><div>6</div><div>5</div><div>4</div><div>3</div><div>2</div><div>1</div><div>0</div>';
        }
        update31GraphVisualScale(1);
      }
    });
  });

  // 3-1 퀴즈 정답 확인
  const btnCheckQ31 = document.getElementById('btn-check-q31');
  if (btnCheckQ31) {
    btnCheckQ31.addEventListener('click', () => {
      const q31Radio = document.querySelector('input[name="q31"]:checked');
      const fb = document.getElementById('q31-feedback');
      const nextBtn = document.getElementById('btn-go-to-32');

      if (!q31Radio) {
        fb.textContent = '⚠️ 답을 선택해 주세요!';
        fb.className = 'quiz-feedback error';
        fb.style.display = 'block';
        return;
      }

      if (q31Radio.value === '2') {
        fb.innerHTML = '정답입니다! 🎉 일회용 컵이 12개이므로 눈금 한 칸을 2개로 정하면 16개까지 나타낼 수 있어서 최댓값인 12개도 문제없이 그릴 수 있습니다. 활동 2로 가기 버튼을 눌러 해결해 보세요!';
        fb.className = 'quiz-feedback success';
        fb.style.display = 'block';
        if (nextBtn) nextBtn.disabled = false;
        playConfetti();
      } else {
        fb.innerHTML = '아쉽게도 오답입니다. 😢 다시 생각해 볼까요?<br>눈금 한 칸이 1개일 때는 8개까지만 나타낼 수 있습니다. 12개까지 모두 나타내려면 눈금 한 칸의 크기를 늘려야 합니다. 눈금 한 칸을 5개로 하면(왼쪽 그래프 참고) 나무젓가락(8개), 비닐봉지(6개), 숟가락(2개)처럼 작은 값들이 눈금선 사이에 어정쩡하게 걸쳐 있어 그리거나 정확히 읽기 매우 어렵습니다.';
        fb.className = 'quiz-feedback error';
        fb.style.display = 'block';
      }
    });
  }

  // 3-2 그래프 그리기 검사
  const btnCheckDrawing32 = document.getElementById('btn-check-drawing-32');
  if (btnCheckDrawing32) {
    btnCheckDrawing32.addEventListener('click', () => {
      const fb32 = document.getElementById('drawing-feedback-32');
      const nextBtn32 = document.getElementById('btn-go-to-33');
      const isCorrect = Object.keys(TARGET_DRAWING_3).every(item => {
        return state.drawing32Data[item] === TARGET_DRAWING_3[item];
      });

      if (isCorrect) {
        fb32.textContent = '참 잘했습니다! 2단위 눈금의 막대그래프를 정확한 높이로 완성했습니다. 컵(12개)도 잘 보이지요? 활동 3으로 가기 버튼을 눌러보세요!';
        fb32.className = 'quiz-feedback success';
        fb32.style.display = 'block';
        if (nextBtn32) nextBtn32.disabled = false;
        playConfetti();
      } else {
        fb32.innerHTML = '❌ 수치가 맞지 않는 항목이 있습니다. 다시 눈금을 세어 맞춰보세요!<br>힌트: 나무젓가락 8개(4칸), 일회용 컵 12개(6칸), 비닐봉지 6개(3칸), 일회용 숟가락 2개(1칸)입니다.';
        fb32.className = 'quiz-feedback error';
        fb32.style.display = 'block';
      }
    });
  }

  // 3-3 그래프 그리기 검사
  const btnCheckDrawing33 = document.getElementById('btn-check-drawing-33');
  if (btnCheckDrawing33) {
    btnCheckDrawing33.addEventListener('click', () => {
      const fb33 = document.getElementById('drawing-feedback-33');
      const nextBtn33 = document.getElementById('btn-next-to-4');
      const isCorrect = Object.keys(TARGET_DRAWING_3).every(item => {
        return state.drawing33Data[item] === TARGET_DRAWING_3[item];
      });

      if (isCorrect) {
        if (MAX_ENABLED_STEP < 4) {
          fb33.textContent = '🎉 참 잘했습니다! 가로와 세로의 위치를 바꾸어 가로 막대그래프를 멋지게 완성했습니다. 3단계까지의 모든 학습을 성공적으로 마쳤습니다!';
        } else {
          fb33.textContent = '참 잘했습니다! 💮 가로와 세로의 위치를 바꾸어 가로 막대그래프로 멋지게 완성했습니다. 이제 4단계로 가기 버튼을 눌러 다음 모험을 계속해 봅시다!';
        }
        fb33.className = 'quiz-feedback success';
        fb33.style.display = 'block';
        if (nextBtn33) nextBtn33.disabled = false;
        unlockNext(3);
        playConfetti();
      } else {
        fb33.innerHTML = '❌ 수치가 맞지 않는 항목이 있습니다. 가로 막대의 길이를 다시 조절해 보세요!<br>힌트: 나무젓가락 8개(4칸), 일회용 컵 12개(6칸), 비닐봉지 6개(3칸), 일회용 숟가락 2개(1칸)입니다.';
        fb33.className = 'quiz-feedback error';
        fb33.style.display = 'block';
      }
    });
  }

  // 3단계 서브 네비게이션
  const btnGoTo32 = document.getElementById('btn-go-to-32');
  if (btnGoTo32) {
    btnGoTo32.addEventListener('click', () => {
      document.getElementById('sub-step-3-1').style.display = 'none';
      const sub32 = document.getElementById('sub-step-3-2');
      sub32.style.display = 'block';
      sub32.scrollIntoView({ behavior: 'smooth' });
      update32DrawingUI();
    });
  }

  const btnBackTo31 = document.getElementById('btn-back-to-31');
  if (btnBackTo31) {
    btnBackTo31.addEventListener('click', () => {
      document.getElementById('sub-step-3-2').style.display = 'none';
      const sub31 = document.getElementById('sub-step-3-1');
      sub31.style.display = 'block';
      sub31.scrollIntoView({ behavior: 'smooth' });
      update31DrawingUI();
    });
  }

  const btnGoTo33 = document.getElementById('btn-go-to-33');
  if (btnGoTo33) {
    btnGoTo33.addEventListener('click', () => {
      document.getElementById('sub-step-3-2').style.display = 'none';
      const sub33 = document.getElementById('sub-step-3-3');
      sub33.style.display = 'block';
      sub33.scrollIntoView({ behavior: 'smooth' });
      update33DrawingUI();
    });
  }

  const btnBackTo32 = document.getElementById('btn-back-to-32');
  if (btnBackTo32) {
    btnBackTo32.addEventListener('click', () => {
      document.getElementById('sub-step-3-3').style.display = 'none';
      const sub32 = document.getElementById('sub-step-3-2');
      sub32.style.display = 'block';
      sub32.scrollIntoView({ behavior: 'smooth' });
      update32DrawingUI();
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
  // I. 4단계: 실시간 그래프 작성 및 모험
  // ==========================================
  const POCHEON_SPOTS = {
    sanjeong: { name: '산정호수 🏞️', votes: 12, img: 'images/sanjeong_lake.png' },
    artvalley: { name: '포천아트밸리 🎨', votes: 10, img: 'images/art_valley.png' },
    herbisland: { name: '허브아일랜드 🌿', votes: 8, img: 'images/herb_island.png' },
    arboretum: { name: '국립수목원 🌳', votes: 6, img: 'images/national_arboretum.png' },
    bidulginang: { name: '비둘기낭 폭포 🏞️', votes: 5, img: 'images/bidulginang.png' },
    myeongseong: { name: '명성산 억새밭 🌾', votes: 4, img: 'images/myeongseong_silvergrass.png' },
    hangawon: { name: '한과박물관(한가원) 🥮', votes: 3, img: 'images/hangawon.png' },
    amazing: { name: '어메이징파크 🎡', votes: 2, img: 'images/amazing_park.png' }
  };

  const spotCheckboxes = document.querySelectorAll('input[name="spot-select"]');
  function updateSelectionCount() {
    const selected = Array.from(spotCheckboxes).filter(c => c.checked);
    const countMsg = document.getElementById('selection-count-msg');
    if (countMsg) {
      countMsg.textContent = `현재 ${selected.length}개 선택됨 (4~7개 선택 가능)`;
    }
  }

  spotCheckboxes.forEach(cb => {
    const label = cb.closest('.spot-select-card');
    if (label && cb.checked) {
      label.classList.add('selected');
    }
    
    cb.addEventListener('change', () => {
      const selected = Array.from(spotCheckboxes).filter(c => c.checked);
      if (selected.length > 7) {
        cb.checked = false;
        alert('조사할 항목은 최대 7개까지 선택할 수 있습니다!');
        return;
      }
      
      if (label) {
        if (cb.checked) {
          label.classList.add('selected');
        } else {
          label.classList.remove('selected');
        }
      }
      updateSelectionCount();
    });
  });

  const btnCompleteSelection = document.getElementById('btn-complete-selection');
  if (btnCompleteSelection) {
    btnCompleteSelection.addEventListener('click', () => {
      const selected = Array.from(spotCheckboxes).filter(c => c.checked);
      if (selected.length < 4 || selected.length > 7) {
        alert('우리 모둠이 조사할 항목을 최소 4개에서 최대 7개까지 선택해 주세요!');
        return;
      }

      state.selectedSpots = selected.map(c => c.value);

      const countingWorkspace = document.getElementById('counting-workspace-41');
      if (countingWorkspace) {
        countingWorkspace.style.display = 'block';
        countingWorkspace.scrollIntoView({ behavior: 'smooth' });
      }

      const tbody = document.getElementById('counting-table-body');
      if (tbody) {
        tbody.innerHTML = '';
        state.selectedSpots.forEach(key => {
          const spot = POCHEON_SPOTS[key];
          const row = document.createElement('tr');
          row.innerHTML = `
            <td><strong>${spot.name}</strong></td>
            <td>
              <input type="number" class="table-vote-input ebs-input" data-key="${key}" min="0" max="50" placeholder="개수 입력">
            </td>
          `;
          tbody.appendChild(row);
        });

        const sumRow = document.createElement('tr');
        sumRow.style.background = 'rgba(251, 191, 36, 0.1)';
        sumRow.innerHTML = `
          <td><strong>합계</strong></td>
          <td>
            <input type="number" id="table-sum-input" class="ebs-input" style="font-weight: 800; border-color: #fbbf24;" min="0" placeholder="합계 입력">
          </td>
        `;
        tbody.appendChild(sumRow);
      }

      renderLocalChalkboard();
    });
  }

  function renderLocalChalkboard() {
    const wrapper = document.getElementById('local-stickers-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = '';

    state.selectedSpots.forEach(key => {
      const spot = POCHEON_SPOTS[key];
      const card = document.createElement('div');
      card.className = 'local-chalk-card';
      card.style.cssText = 'background: rgba(30, 41, 59, 0.5); border: 1.5px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px;';

      let stickersHtml = '';
      for (let i = 0; i < spot.votes; i++) {
        stickersHtml += `<span class="chalk-sticker" style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#10b981; margin:2px; box-shadow: 0 0 4px #10b981;"></span>`;
      }

      card.innerHTML = `
        <img src="${spot.img}" alt="${spot.name}" style="width: 80px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2);">
        <div style="font-weight: 800; font-size: 0.85rem; color: #f8fafc;">${spot.name}</div>
        <div style="display: flex; flex-wrap: wrap; justify-content: center; max-width: 100px; min-height: 25px; align-items: center;">${stickersHtml}</div>
        <div style="font-size: 0.8rem; font-weight: 800; color: #10b981;">${spot.votes}표</div>
      `;
      wrapper.appendChild(card);
    });
  }

  const btnToggleLocalBoard = document.getElementById('btn-toggle-local-board');
  if (btnToggleLocalBoard) {
    btnToggleLocalBoard.addEventListener('click', () => {
      const box = document.getElementById('local-board-box');
      if (box) {
        if (box.style.display === 'none') {
          box.style.display = 'block';
          btnToggleLocalBoard.textContent = '🖥️ 가상 투표판 접기';
        } else {
          box.style.display = 'none';
          btnToggleLocalBoard.textContent = '🖥️ 화면이 안 보여요! 가상 투표판 열기';
        }
      }
    });
  }

  const btnCheckTable41 = document.getElementById('btn-check-table-41');
  if (btnCheckTable41) {
    btnCheckTable41.addEventListener('click', () => {
      const inputs = document.querySelectorAll('.table-vote-input');
      const sumInput = document.getElementById('table-sum-input');
      const feedback = document.getElementById('feedback-table-41');
      if (!sumInput) return;

      let hasEmpty = false;
      let calculatedSum = 0;
      let values = [];
      let inputMap = {};

      inputs.forEach(inp => {
        const valStr = inp.value.trim();
        if (valStr === '') {
          hasEmpty = true;
        }
        const val = parseInt(valStr, 10) || 0;
        calculatedSum += val;
        values.push(val);
        inputMap[inp.getAttribute('data-key')] = val;
      });

      const typedSumStr = sumInput.value.trim();
      if (hasEmpty || typedSumStr === '') {
        feedback.textContent = '⚠️ 모든 표의 항목 칸과 합계 칸을 채워 주세요!';
        feedback.className = 'quiz-feedback error';
        feedback.style.display = 'block';
        return;
      }

      const typedSum = parseInt(typedSumStr, 10);

      if (calculatedSum !== typedSum) {
        feedback.innerHTML = '❌ 합계가 맞지 않습니다! 입력한 각 명소의 표 수를 다시 한 번 더해 보세요.';
        feedback.className = 'quiz-feedback error';
        feedback.style.display = 'block';
        return;
      }

      if (values.some(v => v < 0)) {
        feedback.textContent = '❌ 표 수는 0보다 작을 수 없습니다!';
        feedback.className = 'quiz-feedback error';
        feedback.style.display = 'block';
        return;
      }

      state.customGraph.items = state.selectedSpots.map(key => {
        return {
          key: key,
          name: POCHEON_SPOTS[key].name,
          val: inputMap[key]
        };
      });
      state.customGraph.unit = '표';
      state.customGraph.title = '우리 반 친구들이 가장 가보고 싶은 포천의 명소';

      feedback.innerHTML = '정답입니다! 🎉 표를 완성했습니다. 이제 4-2단계 막대그래프 그리기 도구로 그래프를 그려봅시다!';
      feedback.className = 'quiz-feedback success';
      feedback.style.display = 'block';
      playConfetti();

      const step42Card = document.getElementById('sub-step-4-2');
      if (step42Card) {
        step42Card.style.display = 'block';
        loadEbsTableData();
        step42Card.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  let ebsDirection = 'vertical';
  state.drawnSimulatorValues = {};

  function loadEbsTableData() {
    const tbody = document.getElementById('ebs-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    state.customGraph.items.forEach(item => {
      const row = document.createElement('tr');
      row.setAttribute('data-key', item.key);
      row.innerHTML = `
        <td><span class="ebs-row-name" style="font-weight: 800; color: #1e293b;">${item.name}</span></td>
        <td><span class="ebs-row-target-val" style="font-weight: bold; color: #0284c7;">${item.val}표</span></td>
      `;
      tbody.appendChild(row);

      // Initialize drawn value to 0
      state.drawnSimulatorValues[item.key] = 0;
    });
    
    ebsDirection = 'vertical';
    renderEbsGraph();

    const unitLabel = document.getElementById('ebs-chart-unit-label');
    if (unitLabel) unitLabel.textContent = '단위: 표';

    // Show the check and save button immediately
    const saveBtn = document.getElementById('btn-save-ebs-graph');
    if (saveBtn) {
      saveBtn.style.display = 'block';
      saveBtn.textContent = '그래프 검사하고 저장하기! 💾';
    }

    // Enable toolbar controls
    const ebsScaleSelect = document.getElementById('ebs-scale-select');
    const ebsUnitInput = document.getElementById('ebs-unit-input');
    const btnEbsDirection = document.getElementById('btn-ebs-direction');
    if (ebsScaleSelect) ebsScaleSelect.disabled = false;
    if (ebsUnitInput) ebsUnitInput.disabled = false;
    if (btnEbsDirection) btnEbsDirection.disabled = false;
  }

  // Bind click event listener on the chart area for adjust buttons
  const chartInner = document.getElementById('ebs-chart-inner');
  if (chartInner) {
    chartInner.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-ebs-adjust');
      if (!btn) return;
      const key = btn.getAttribute('data-key');
      const isUp = btn.classList.contains('ebs-up');
      
      const item = state.customGraph.items.find(x => x.key === key);
      if (!item) return;

      const scaleSelect = document.getElementById('ebs-scale-select');
      const scale = parseInt(scaleSelect ? scaleSelect.value : '2', 10);
      const minDivisions = 5;
      const limit = Math.max(Math.ceil(Math.max(...state.customGraph.items.map(x => x.val), 1) / scale), minDivisions) * scale;

      let val = state.drawnSimulatorValues[key] || 0;
      if (isUp) {
        if (val < limit) val++;
      } else {
        if (val > 0) val--;
      }
      state.drawnSimulatorValues[key] = val;
      renderEbsGraph();
    });
  }

  const ebsTitleInput = document.getElementById('ebs-title');
  if (ebsTitleInput) {
    ebsTitleInput.addEventListener('input', () => {
      const titleLabel = document.getElementById('ebs-chart-title-label');
      if (titleLabel) titleLabel.textContent = ebsTitleInput.value.trim() || '무제';
    });
  }

  const ebsScaleSelect = document.getElementById('ebs-scale-select');
  if (ebsScaleSelect) {
    ebsScaleSelect.addEventListener('change', () => {
      renderEbsGraph();
    });
  }

  const ebsUnitInput = document.getElementById('ebs-unit-input');
  if (ebsUnitInput) {
    ebsUnitInput.addEventListener('input', () => {
      const unitLabel = document.getElementById('ebs-chart-unit-label');
      if (unitLabel) unitLabel.textContent = `단위: ${ebsUnitInput.value.trim() || '표'}`;
    });
  }

  const btnEbsDirection = document.getElementById('btn-ebs-direction');
  if (btnEbsDirection) {
    btnEbsDirection.addEventListener('click', () => {
      ebsDirection = (ebsDirection === 'vertical') ? 'horizontal' : 'vertical';
      renderEbsGraph();
    });
  }

  function renderEbsGraph() {
    const container = document.getElementById('ebs-chart-inner');
    if (!container) return;
    container.innerHTML = '';

    const items = state.customGraph.items.map(item => {
      const val = state.drawnSimulatorValues[item.key] !== undefined ? state.drawnSimulatorValues[item.key] : 0;
      return {
        key: item.key,
        name: item.name,
        val: val
      };
    });

    if (items.length === 0) return;

    const scale = parseInt(ebsScaleSelect ? ebsScaleSelect.value : '2', 10);
    const unit = ebsUnitInput ? ebsUnitInput.value.trim() || '표' : '표';

    // Use target values for Y-axis scaling to keep grid limits consistent
    const maxVal = Math.max(...state.customGraph.items.map(x => x.val), 1);
    const minDivisions = 5;
    const divisions = Math.max(Math.ceil(maxVal / scale), minDivisions);
    const limit = divisions * scale;

    const axisY = document.createElement('div');
    axisY.className = 'ebs-axis-y';
    container.appendChild(axisY);

    const axisX = document.createElement('div');
    axisX.className = 'ebs-axis-x';
    container.appendChild(axisX);

    if (ebsDirection === 'vertical') {
      container.classList.remove('ebs-mode-horizontal');
      for (let i = 0; i <= divisions; i++) {
        const pct = (i / divisions) * 100;
        const line = document.createElement('div');
        line.className = 'ebs-grid-line';
        line.style.bottom = `${pct}%`;
        container.appendChild(line);
      }

      const yLabelBox = document.createElement('div');
      yLabelBox.className = 'ebs-y-label-box';
      for (let i = divisions; i >= 0; i--) {
        const labelDiv = document.createElement('div');
        labelDiv.textContent = i * scale;
        yLabelBox.appendChild(labelDiv);
      }
      container.appendChild(yLabelBox);

      const xLabelBox = document.createElement('div');
      xLabelBox.className = 'ebs-x-label-box';
      items.forEach(item => {
        const labelDiv = document.createElement('div');
        labelDiv.textContent = stripEmoji(item.name);
        labelDiv.style.flex = '1';
        labelDiv.style.textAlign = 'center';
        xLabelBox.appendChild(labelDiv);
      });
      container.appendChild(xLabelBox);

      const barsWrapper = document.createElement('div');
      barsWrapper.className = 'ebs-bars-wrapper';
      items.forEach(item => {
        const col = document.createElement('div');
        col.className = 'ebs-bar-col';
        col.style.flex = '1';

        const pct = (item.val / limit) * 100;
        col.innerHTML = `
          <div class="ebs-bar" style="height: ${pct}%; width: 24px; background-color: #3b82f6; border-radius: 4px 4px 0 0; position: relative; transition: height 0.2s ease;">
            <div class="ebs-bar-val-label">${item.val}</div>
          </div>
          <div class="ebs-bar-adjust" style="position: absolute; top: -35px; display: flex; gap: 2px; z-index: 10;">
            <button class="btn-ebs-adjust ebs-up" data-key="${item.key}" style="width: 18px; height: 18px; font-weight: bold; border-radius: 50%; border: 1px solid #cbd5e1; background: #e2e8f0; color: #1e293b; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; user-select: none;">+</button>
            <button class="btn-ebs-adjust ebs-down" data-key="${item.key}" style="width: 18px; height: 18px; font-weight: bold; border-radius: 50%; border: 1px solid #cbd5e1; background: #e2e8f0; color: #1e293b; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; user-select: none;">-</button>
          </div>
        `;
        barsWrapper.appendChild(col);
      });
      container.appendChild(barsWrapper);

    } else {
      container.classList.add('ebs-mode-horizontal');
      for (let i = 0; i <= divisions; i++) {
        const pct = (i / divisions) * 100;
        const line = document.createElement('div');
        line.className = 'ebs-grid-line-vertical';
        line.style.left = `${pct}%`;
        container.appendChild(line);
      }

      const xLabelBoxHorizontal = document.createElement('div');
      xLabelBoxHorizontal.className = 'ebs-x-label-box-horizontal';
      for (let i = 0; i <= divisions; i++) {
        const labelDiv = document.createElement('div');
        labelDiv.textContent = i * scale;
        labelDiv.style.position = 'absolute';
        labelDiv.style.left = `${(i / divisions) * 100}%`;
        labelDiv.style.transform = 'translateX(-50%)';
        xLabelBoxHorizontal.appendChild(labelDiv);
      }
      container.appendChild(xLabelBoxHorizontal);

      const yLabelBoxHorizontal = document.createElement('div');
      yLabelBoxHorizontal.className = 'ebs-y-label-box-horizontal';
      items.forEach(item => {
        const labelDiv = document.createElement('div');
        const cleanName = stripEmoji(item.name);
        labelDiv.textContent = cleanName;
        labelDiv.title = cleanName;
        labelDiv.style.height = `${100 / items.length}%`;
        labelDiv.style.display = 'flex';
        labelDiv.style.alignItems = 'center';
        labelDiv.style.justifyContent = 'flex-end';
        yLabelBoxHorizontal.appendChild(labelDiv);
      });
      container.appendChild(yLabelBoxHorizontal);

      const barsWrapperHorizontal = document.createElement('div');
      barsWrapperHorizontal.className = 'ebs-bars-wrapper-horizontal';
      items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'ebs-bar-row-horizontal';
        row.style.height = `${100 / items.length}%`;
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.width = '100%';

        const pct = (item.val / limit) * 100;
        row.innerHTML = `
          <div class="ebs-bar-horizontal" style="width: ${pct}%; height: 14px; background-color: #3b82f6; border-radius: 0 4px 4px 0; position: relative; transition: width 0.2s ease;">
            <div class="ebs-bar-val-label-horizontal">${item.val}</div>
          </div>
          <div class="ebs-bar-adjust-horizontal" style="position: absolute; right: -60px; display: flex; gap: 4px; z-index: 10;">
            <button class="btn-ebs-adjust ebs-up" data-key="${item.key}" style="width: 18px; height: 18px; font-weight: bold; border-radius: 50%; border: 1px solid #cbd5e1; background: #e2e8f0; color: #1e293b; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; user-select: none;">+</button>
            <button class="btn-ebs-adjust ebs-down" data-key="${item.key}" style="width: 18px; height: 18px; font-weight: bold; border-radius: 50%; border: 1px solid #cbd5e1; background: #e2e8f0; color: #1e293b; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; user-select: none;">-</button>
          </div>
        `;
        barsWrapperHorizontal.appendChild(row);
      });
      container.appendChild(barsWrapperHorizontal);
    }
  }

  const btnSaveEbsGraph = document.getElementById('btn-save-ebs-graph');
  if (btnSaveEbsGraph) {
    btnSaveEbsGraph.addEventListener('click', () => {
      const isCorrect = state.customGraph.items.every(item => {
        const targetVal = item.val;
        const drawnVal = state.drawnSimulatorValues[item.key] || 0;
        return targetVal === drawnVal;
      });

      const fb = document.getElementById('feedback-ebs-42');

      if (!isCorrect) {
        if (fb) {
          fb.innerHTML = '❌ 막대그래프의 높이가 조사 결과 표의 값과 다릅니다! 표를 보고 알맞은 높이가 되도록 [+], [-] 버튼으로 직접 그려 보세요.';
          fb.className = 'quiz-feedback error';
          fb.style.display = 'block';
        }
        return;
      }

      state.customGraph.title = (ebsTitleInput ? ebsTitleInput.value.trim() : '') || '우리 반 친구들이 가장 가보고 싶은 포천의 명소';
      state.customGraph.unit = (ebsUnitInput ? ebsUnitInput.value.trim() : '') || '표';
      state.customGraph.direction = ebsDirection;
      state.customGraph.scale = parseInt(ebsScaleSelect ? ebsScaleSelect.value : '2', 10);

      localStorage.setItem('barGraph_customGraph', JSON.stringify(state.customGraph));

      if (fb) {
        fb.innerHTML = '정답입니다! 🎉 표의 수치와 막대의 높이가 정확히 일치합니다. 그래프를 성공적으로 완성하여 저장했습니다!';
        fb.className = 'quiz-feedback success';
        fb.style.display = 'block';
      }

      const btnGoTo43 = document.getElementById('btn-go-to-43');
      if (btnGoTo43) btnGoTo43.disabled = false;

      playConfetti();
    });
  }

  const btnGoTo43 = document.getElementById('btn-go-to-43');
  if (btnGoTo43) {
    btnGoTo43.addEventListener('click', () => {
      const card42 = document.getElementById('sub-step-4-2');
      const card43 = document.getElementById('sub-step-4-3');
      if (card42) card42.style.display = 'none';
      if (card43) {
        card43.style.display = 'block';
        populateQ43Options();
        renderQ43PreviewGraph();
        card43.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  const btnQ43ToggleDirection = document.getElementById('btn-q43-toggle-direction');
  if (btnQ43ToggleDirection) {
    btnQ43ToggleDirection.addEventListener('click', () => {
      state.customGraph.direction = state.customGraph.direction === 'horizontal' ? 'vertical' : 'horizontal';
      renderQ43PreviewGraph();
    });
  }

  const btnBackTo41 = document.getElementById('btn-back-to-41');
  if (btnBackTo41) {
    btnBackTo41.addEventListener('click', () => {
      const card42 = document.getElementById('sub-step-4-2');
      const card41 = document.getElementById('sub-step-4-1');
      if (card42) card42.style.display = 'none';
      if (card41) {
        card41.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  const btnBackTo42 = document.getElementById('btn-back-to-42');
  if (btnBackTo42) {
    btnBackTo42.addEventListener('click', () => {
      const card43 = document.getElementById('sub-step-4-3');
      const card42 = document.getElementById('sub-step-4-2');
      if (card43) card43.style.display = 'none';
      if (card42) {
        card42.style.display = 'block';
        card42.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  function populateQ43Options() {
    const container = document.getElementById('q43-q1-options');
    if (!container) return;
    container.innerHTML = '';

    state.customGraph.items.forEach(item => {
      const label = document.createElement('label');
      label.innerHTML = `
        <input type="radio" name="q43_1" value="${item.name}">
        ${item.name}
      `;
      container.appendChild(label);
    });
  }

  function renderQ43PreviewGraph() {
    const titleLabel = document.getElementById('q43-graph-title');
    const items = state.customGraph.items || [];
    if (items.length === 0) return;

    if (titleLabel) {
      titleLabel.textContent = state.customGraph.title || '내가 완성한 포천 명소 그래프';
    }

    const scale = state.customGraph.scale || 2;
    const maxVal = Math.max(...items.map(x => x.val), 1);
    const minDivisions = 5;
    const divisions = Math.max(Math.ceil(maxVal / scale), minDivisions);
    const limit = divisions * scale;
    const isHorizontal = state.customGraph.direction === 'horizontal';

    const container = document.querySelector('.q43-chart-container');
    if (container) {
      container.innerHTML = '';
      
      const axisY = document.createElement('div');
      axisY.className = 'ebs-axis-y';
      container.appendChild(axisY);

      const axisX = document.createElement('div');
      axisX.className = 'ebs-axis-x';
      container.appendChild(axisX);

      if (isHorizontal) {
        container.className = 'q43-chart-container ebs-chart-container ebs-mode-horizontal';
        container.style.cssText = '';
        container.style.position = 'relative';
        container.style.height = '200px';
        container.style.width = '260px';
        container.style.display = 'flex';
        container.style.marginTop = '30px';
        container.style.marginBottom = '75px';
        container.style.marginLeft = 'auto';
        container.style.marginRight = 'auto';
        container.style.transform = 'translateX(30px)';

        for (let i = 0; i <= divisions; i++) {
          const pct = (i / divisions) * 100;
          const line = document.createElement('div');
          line.className = 'ebs-grid-line-vertical';
          line.style.left = `${pct}%`;
          container.appendChild(line);
        }

        const xLabelBoxHorizontal = document.createElement('div');
        xLabelBoxHorizontal.className = 'ebs-x-label-box-horizontal';
        for (let i = 0; i <= divisions; i++) {
          const labelDiv = document.createElement('div');
          labelDiv.textContent = i * scale;
          labelDiv.style.position = 'absolute';
          labelDiv.style.left = `${(i / divisions) * 100}%`;
          labelDiv.style.transform = 'translateX(-50%)';
          xLabelBoxHorizontal.appendChild(labelDiv);
        }
        container.appendChild(xLabelBoxHorizontal);

        const yLabelBoxHorizontal = document.createElement('div');
        yLabelBoxHorizontal.className = 'ebs-y-label-box-horizontal';
        items.forEach(item => {
          const labelDiv = document.createElement('div');
          const cleanName = stripEmoji(item.name);
          labelDiv.textContent = cleanName;
          labelDiv.title = cleanName;
          labelDiv.style.height = `${100 / items.length}%`;
          labelDiv.style.display = 'flex';
          labelDiv.style.alignItems = 'center';
          labelDiv.style.justifyContent = 'flex-end';
          labelDiv.style.whiteSpace = 'nowrap';
          yLabelBoxHorizontal.appendChild(labelDiv);
        });
        container.appendChild(yLabelBoxHorizontal);

        const wrapper = document.createElement('div');
        wrapper.id = 'q43-bars-wrapper';
        wrapper.className = 'ebs-bars-wrapper-horizontal';
        items.forEach(item => {
          const row = document.createElement('div');
          row.className = 'ebs-bar-row-horizontal';
          row.style.height = `${100 / items.length}%`;
          row.style.display = 'flex';
          row.style.alignItems = 'center';
          row.style.width = '100%';

          const pct = (item.val / limit) * 100;
          row.innerHTML = `
            <div class="ebs-bar-horizontal" style="width: ${pct}%; height: 14px; background-color: #3b82f6; border-radius: 0 4px 4px 0; position: relative; transition: width 0.2s ease;">
              <div class="ebs-bar-val-label-horizontal">${item.val}</div>
            </div>
          `;
          wrapper.appendChild(row);
        });
        container.appendChild(wrapper);

      } else {
        container.className = 'q43-chart-container ebs-chart-container';
        container.style.cssText = '';
        container.style.position = 'relative';
        container.style.height = '200px';
        container.style.width = '320px';
        container.style.display = 'flex';
        container.style.marginTop = '30px';
        container.style.marginBottom = '75px';
        container.style.marginLeft = 'auto';
        container.style.marginRight = 'auto';
        container.style.transform = 'translateX(7.5px)';

        for (let i = 0; i <= divisions; i++) {
          const pct = (i / divisions) * 100;
          const line = document.createElement('div');
          line.className = 'ebs-grid-line';
          line.style.bottom = `${pct}%`;
          container.appendChild(line);
        }

        const yLabelBox = document.createElement('div');
        yLabelBox.className = 'ebs-y-label-box';
        for (let i = divisions; i >= 0; i--) {
          const labelDiv = document.createElement('div');
          labelDiv.textContent = i * scale;
          yLabelBox.appendChild(labelDiv);
        }
        container.appendChild(yLabelBox);

        const xLabelBox = document.createElement('div');
        xLabelBox.className = 'ebs-x-label-box';
        items.forEach(item => {
          const labelDiv = document.createElement('div');
          const cleanName = stripEmoji(item.name);
          labelDiv.textContent = cleanName;
          labelDiv.style.flex = '1';
          labelDiv.style.textAlign = 'center';
          labelDiv.style.whiteSpace = 'nowrap';
          labelDiv.style.fontSize = '0.7rem';
          xLabelBox.appendChild(labelDiv);
        });
        container.appendChild(xLabelBox);

        const wrapper = document.createElement('div');
        wrapper.id = 'q43-bars-wrapper';
        wrapper.className = 'ebs-bars-wrapper';
        items.forEach(item => {
          const col = document.createElement('div');
          col.className = 'ebs-bar-col';
          col.style.flex = '1';

          const pct = (item.val / limit) * 100;
          col.innerHTML = `
            <div class="ebs-bar" style="height: ${pct}%; width: 24px; background-color: #3b82f6; border-radius: 4px 4px 0 0; position: relative; transition: height 0.2s ease;">
              <div class="ebs-bar-val-label">${item.val}</div>
            </div>
          `;
          wrapper.appendChild(col);
        });
        container.appendChild(wrapper);
      }
    }
  }

  const btnCheckSub43 = document.getElementById('btn-check-sub43');
  if (btnCheckSub43) {
    btnCheckSub43.addEventListener('click', () => {
      const ansQ1 = document.querySelector('input[name="q43_1"]:checked');
      const ansQ2 = document.querySelector('input[name="q43_2"]:checked');
      const ansQ3 = document.querySelector('input[name="q43_3"]:checked');
      const fb = document.getElementById('feedback-sub43');

      if (!ansQ1 || !ansQ2 || !ansQ3) {
        fb.textContent = '⚠️ 모든 질문의 답을 선택해 주세요!';
        fb.className = 'quiz-feedback error';
        fb.style.display = 'block';
        return;
      }

      const maxVal = Math.max(...state.customGraph.items.map(x => x.val));
      const maxItems = state.customGraph.items.filter(x => x.val === maxVal).map(x => x.name);
      const isQ1Correct = maxItems.includes(ansQ1.value);

      const isQ2Correct = ansQ2.value === 'a';
      const isQ3Correct = ansQ3.value === 'b';

      if (isQ1Correct && isQ2Correct && isQ3Correct) {
        if (!window.IS_DEV_MODE) {
          fb.innerHTML = '모두 정답입니다! 🎉 막대그래프를 해석하는 능력도 대단하네요! 4단계까지의 모든 학습을 성공적으로 마쳤습니다!';
        } else {
          fb.innerHTML = '모두 정답입니다! 🎉 막대그래프를 해석하는 능력도 대단하네요! 이제 5단계로 이동하여 눈금의 크기 비교 학습을 해봅시다.';
        }
        fb.className = 'quiz-feedback success';
        fb.style.display = 'block';
        
        unlockNext(4);
        const btnNextTo5 = document.getElementById('btn-next-to-5');
        if (btnNextTo5) btnNextTo5.disabled = false;
        
        playConfetti();
      } else {
        let errText = '❌ 일부 오답이 있습니다. 다시 생각해 볼까요?<br>';
        if (!isQ1Correct) errText += '- <strong>Q1</strong>: 그래프의 막대 높이(또는 길이)가 가장 큰 항목을 다시 찾아보세요.<br>';
        if (!isQ2Correct) errText += '- <strong>Q2</strong>: 그래프 방향을 바꾸면 가로와 세로가 나타내는 내용이 서로 어떻게 되나요?<br>';
        if (!isQ3Correct) errText += '- <strong>Q3</strong>: 세로에서 가로로 방향을 바꾸어도 변하지 않는 데이터 고유의 수치와 막대의 실제 길이를 확인해 보세요.';
        
        fb.innerHTML = errText;
        fb.className = 'quiz-feedback error';
        fb.style.display = 'block';
      }
    });
  }

  const btnNextTo5 = document.getElementById('btn-next-to-5');
  if (btnNextTo5) {
    btnNextTo5.addEventListener('click', () => {
      showPanel(5);
      updateNavigationUI();
    });
  }

  // ==========================================
  // J. 5단계: 생활 속 막대그래프 개편 로직 (교과서 122~123쪽 데이터 동기화)
  // ==========================================
  
  // 5-1. 서브 탭 전환 및 상태 반영 함수
  function initStep5() {
    const tabs = document.querySelectorAll('.step5-tab-btn');
    const panels = document.querySelectorAll('.step5-act-panel');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const actNum = tab.getAttribute('data-act');
        
        // 잠금 상태인 경우 클릭 무시
        if (tab.classList.contains('locked') || tab.disabled) {
          return;
        }

        // 탭 활성화 토글
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // 패널 활성화 토글
        panels.forEach(p => p.classList.remove('active'));
        const targetPanel = document.getElementById(`step5-act${actNum}-panel`);
        if (targetPanel) {
          targetPanel.classList.add('active');
        }
      });
    });

    updateStep5TabsUI();
  }

  // 5-2. 탭 UI 상태 업데이트
  function updateStep5TabsUI() {
    const btnAct5_2 = document.getElementById('btn-act5-2');
    const btnAct5_3 = document.getElementById('btn-act5-3');
    const btnNextTo6 = document.getElementById('btn-next-to-6');

    // 5-1 클리어 시 5-2 열림
    if (state.step5Act1Cleared) {
      if (btnAct5_2) {
        btnAct5_2.classList.remove('locked');
        btnAct5_2.disabled = false;
        btnAct5_2.innerHTML = '활동 5-2: 우리 지역 문제 해결 🏘️';
      }
    } else {
      if (btnAct5_2) {
        btnAct5_2.classList.add('locked');
        btnAct5_2.disabled = true;
        btnAct5_2.innerHTML = '활동 5-2: 우리 지역 문제 해결 🏘️ 🔒';
      }
    }

    // 5-2 클리어 시 5-3 열림
    if (state.step5Act2Cleared) {
      if (btnAct5_3) {
        btnAct5_3.classList.remove('locked');
        btnAct5_3.disabled = false;
        btnAct5_3.innerHTML = '활동 5-3: 독도 방문객 뉴스 🏝️';
      }
    } else {
      if (btnAct5_3) {
        btnAct5_3.classList.add('locked');
        btnAct5_3.disabled = true;
        btnAct5_3.innerHTML = '활동 5-3: 독도 방문객 뉴스 🏝️ 🔒';
      }
    }

    // 모든 활동 완료 시 6단계로 가기 활성화
    if (state.step5Act1Cleared && state.step5Act2Cleared && state.step5Act3Cleared) {
      if (btnNextTo6) {
        btnNextTo6.disabled = false;
      }
      unlockNext(5);
    } else {
      if (btnNextTo6) {
        btnNextTo6.disabled = true;
      }
    }
  }

  // 활동 5-1 채점
  const btnCheckAct5_1 = document.getElementById('btn-check-act5-1');
  if (btnCheckAct5_1) {
    btnCheckAct5_1.addEventListener('click', () => {
      const q1 = document.querySelector('input[name="q51_1"]:checked');
      const q2 = document.querySelector('input[name="q51_2"]:checked');
      const q3 = document.querySelector('input[name="q51_3"]:checked');
      const q4 = document.querySelector('input[name="q51_4"]:checked');
      const fb = document.getElementById('act5-1-feedback');

      if (!q1 || !q2 || !q3 || !q4) {
        fb.textContent = '⚠️ 모든 질문의 답을 선택해 주세요!';
        fb.className = 'quiz-feedback error';
        fb.style.display = 'block';
        return;
      }

      const isQ1Correct = (q1.value === '2020');
      const isQ2Correct = (q2.value === '2020');
      const isQ3Correct = (q3.value === 'b');
      const isQ4Correct = (q4.value === 'decrease');

      if (isQ1Correct && isQ2Correct && isQ3Correct && isQ4Correct) {
        fb.innerHTML = '정답입니다! 🎉 친환경 자동차 등록 대수가 가장 많은 연도는 **2020년**이고, 일산화탄소 배출량이 가장 적은 연도도 **2020년**입니다. 두 그래프를 비교해보면 **친환경 자동차가 늘어남에 따라 배출량이 줄어든다**는 성질을 알 수 있습니다. 또한 친환경 자동차가 159만 대로 크게 늘어난 2022년에는 일산화탄소 배출량이 **더 줄어들었을 것**이라고 올바르게 예상하셨습니다. 이렇게 이미 조사된 그래프의 성질을 통해 조사되지 않은 미래의 값도 논리적으로 예상할 수 있습니다. 아주 멋집니다!';
        fb.className = 'quiz-feedback success';
        fb.style.display = 'block';
        state.step5Act1Cleared = true;
        updateStep5TabsUI();
        playConfetti();
        
        // 2초 뒤 자동으로 활동 5-2 탭으로 이동
        setTimeout(() => {
          const btnAct5_2 = document.getElementById('btn-act5-2');
          if (btnAct5_2) btnAct5_2.click();
        }, 2000);
      } else {
        let errText = '❌ 일부 오답이 있습니다. 다시 확인해 볼까요?<br>';
        if (!isQ1Correct) errText += '- **질문 1**: 왼쪽 그래프에서 막대의 높이가 가장 높은 연도를 다시 찾아보세요.<br>';
        if (!isQ2Correct) errText += '- **질문 2**: 오른쪽 그래프에서 막대의 높이가 가장 낮은 연도를 다시 찾아보세요.<br>';
        if (!isQ3Correct) errText += '- **질문 3**: 친환경 자동차의 막대 높이가 연도별로 높아질 때 일산화탄소 배출량 막대의 높이는 어떻게 변하는지 확인해 보세요.<br>';
        if (!isQ4Correct) errText += '- **질문 4**: 친환경 자동차가 크게 늘어난 2022년에 일산화탄소 배출량은 이전보다 더 줄어들었을지, 늘어났을지 변화 성질을 바탕으로 다시 예상해 보세요.';
        fb.innerHTML = errText;
        fb.className = 'quiz-feedback error';
        fb.style.display = 'block';
      }
    });
  }

  // 활동 5-2 채점 (문장 빌더)
  const btnCheckAct5_2 = document.getElementById('btn-check-act5-2');
  if (btnCheckAct5_2) {
    btnCheckAct5_2.addEventListener('click', () => {
      const sel1 = document.getElementById('act52-select-1');
      const sel2 = document.getElementById('act52-select-2');
      const sel3 = document.getElementById('act52-select-3');
      const sel4 = document.getElementById('act52-select-4');
      const sel5 = document.getElementById('act52-select-5');
      const fb = document.getElementById('act5-2-feedback');

      if (!sel1.value || !sel2.value || !sel3.value || !sel4.value || !sel5.value) {
        fb.textContent = '⚠️ 빈칸을 모두 선택해 주세요!';
        fb.className = 'quiz-feedback error';
        fb.style.display = 'block';
        return;
      }

      const isCorrect1 = (sel1.value === 'parking');
      const isCorrect2 = (sel2.value === 'garbage');
      const isCorrect3 = (sel3.value === 'safety');
      const isCorrect4 = (sel4.value === '40');
      const isCorrect5 = (sel5.value === 'noise');

      [sel1, sel2, sel3, sel4, sel5].forEach((sel, idx) => {
        const correctFlag = [isCorrect1, isCorrect2, isCorrect3, isCorrect4, isCorrect5][idx];
        if (correctFlag) {
          sel.classList.add('correct');
        } else {
          sel.classList.remove('correct');
        }
      });

      if (isCorrect1 && isCorrect2 && isCorrect3 && isCorrect4 && isCorrect5) {
        fb.innerHTML = '정답입니다! 🎉 민우네 학교 지역 문제 그래프의 모든 사실을 완벽하게 글로 정리했습니다. 주차 문제가 80명으로 가장 많고, 쓰레기 문제가 20명으로 가장 적었으며, 안전 문제(50명)와 소음 문제(30명)의 합은 주차 문제(80명)와 같습니다. 아주 훌륭합니다!';
        fb.className = 'quiz-feedback success';
        fb.style.display = 'block';
        state.step5Act2Cleared = true;
        updateStep5TabsUI();
        playConfetti();

        // 2초 뒤 자동으로 활동 5-3 탭으로 이동
        setTimeout(() => {
          const btnAct5_3 = document.getElementById('btn-act5-3');
          if (btnAct5_3) btnAct5_3.click();
        }, 2000);
      } else {
        fb.innerHTML = '❌ 틀린 부분이 있습니다. 초록색으로 표시되지 않은 드롭다운 상자의 항목을 그래프 눈금과 다시 대조하여 맞추어 보세요.';
        fb.className = 'quiz-feedback error';
        fb.style.display = 'block';
      }
    });
  }

  // 활동 5-3 채점
  const btnCheckAct5_3 = document.getElementById('btn-check-act5-3');
  if (btnCheckAct5_3) {
    btnCheckAct5_3.addEventListener('click', () => {
      const q1 = document.querySelector('input[name="q53_1"]:checked');
      const q2 = document.querySelector('input[name="q53_2"]:checked');
      const fb = document.getElementById('act5-3-feedback');

      if (!q1 || !q2) {
        fb.textContent = '⚠️ 모든 질문의 답을 선택해 주세요!';
        fb.className = 'quiz-feedback error';
        fb.style.display = 'block';
        return;
      }

      const isQ1Correct = (q1.value === '143680');
      const isQ2Correct = (q2.value === 'b');

      if (isQ1Correct && isQ2Correct) {
        fb.innerHTML = '정답입니다! 🎉 2021년 한 해 동안 독도를 찾은 방문객 수는 **143,680명**입니다. 2020년에는 코로나19 전염병 대유행으로 인해 사람들의 여행 및 이동이 줄어들어 방문객 수가 약 10만 명대로 크게 감소했다는 사회적 맥락도 완벽히 파악했습니다! 5단계의 모든 활동을 정복했습니다!';
        fb.className = 'quiz-feedback success';
        fb.style.display = 'block';
        state.step5Act3Cleared = true;
        updateStep5TabsUI();
        playConfetti();
      } else {
        let errText = '❌ 일부 오답이 있습니다. 다시 확인해 볼까요?<br>';
        if (!isQ1Correct) errText += '- **질문 1**: 기사 내용이나 2021년 막대그래프 높이를 보고 방문객 수를 다시 판독해 보세요.<br>';
        if (!isQ2Correct) errText += '- **질문 2**: 2020년 당시 사회적으로 전국적, 전 세계적 이동 제한을 부른 주요 감염병 유행 사건이 무엇인지 다시 생각해 보세요.';
        fb.innerHTML = errText;
        fb.className = 'quiz-feedback error';
        fb.style.display = 'block';
      }
    });
  }

  // 페이지 로드 시 또는 리셋 시 5단계 탭 초기화 설정 호출
  initStep5();

  const btnNextTo6 = document.getElementById('btn-next-to-6');
  if (btnNextTo6) {
    btnNextTo6.addEventListener('click', () => {
      showPanel(6);
      updateNavigationUI();
    });
  }

  // ==========================================
  // K. 6단계: 수료증 및 배움 정리
  // ==========================================
  const takeawaysList = [1, 2, 3];
  takeawaysList.forEach(num => {
    const item = document.getElementById(`takeaway-item-${num}`);
    if (item) {
      item.addEventListener('click', () => {
        item.classList.toggle('checked');
        checkTakeawayCompletion();
      });
    }
  });

  function checkTakeawayCompletion() {
    const allChecked = [1, 2, 3].every(num => {
      const item = document.getElementById(`takeaway-item-${num}`);
      return item && item.classList.contains('checked');
    });
    const btn = document.getElementById('btn-complete-takeaway');
    if (btn) {
      btn.disabled = !allChecked;
    }
  }

  const btnCompleteTakeaway = document.getElementById('btn-complete-takeaway');
  if (btnCompleteTakeaway) {
    btnCompleteTakeaway.addEventListener('click', () => {
      const certSection = document.getElementById('certificate-section');
      if (certSection) {
        certSection.style.display = 'block';
        renderCertificate();
        certSection.scrollIntoView({ behavior: 'smooth' });
      }
      playConfetti();
    });
  }

  function renderPreviewGraph() {
    const wrapper = document.getElementById('showcase-bars-wrapper');
    const titleLabel = document.getElementById('showcase-graph-title');
    if (!wrapper) return;
    wrapper.innerHTML = '';

    const items = state.customGraph.items || [];
    if (items.length === 0) return;

    if (titleLabel) {
      titleLabel.textContent = state.customGraph.title || '우리 반 친구들이 가장 가보고 싶은 포천의 명소';
    }

    const maxVal = Math.max(...items.map(x => x.val), 1);
    const isHorizontal = state.customGraph.direction === 'horizontal';

    const container = document.querySelector('.showcase-chart-container');
    if (container) {
      if (isHorizontal) {
        container.style.flexDirection = 'column';
        container.style.alignItems = 'flex-start';
        container.style.height = 'auto';
        container.style.paddingLeft = '140px';
        container.style.paddingBottom = '0';
        container.style.borderBottom = 'none';
        container.style.borderLeft = '2px solid #cbd5e1';
        wrapper.style.display = 'block';
        wrapper.style.width = '100%';
        
        items.forEach(item => {
          const row = document.createElement('div');
          row.className = 'showcase-bar-col-horizontal';
          row.style.margin = '12px 0';
          row.style.display = 'flex';
          row.style.alignItems = 'center';
          row.style.width = '100%';
          row.style.position = 'relative';
          
          const pct = (item.val / maxVal) * 100;
          const cleanName = stripEmoji(item.name);
          row.innerHTML = `
            <div class="showcase-bar-name-horizontal" title="${cleanName}" style="position: absolute; left: -135px; width: 130px; text-align: right; font-weight: 800; font-size: 0.75rem; color: #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${cleanName}</div>
            <div class="showcase-bar-horizontal" style="width: ${pct * 0.7}%; height: 16px; background: linear-gradient(90deg, #3b82f6, #1d4ed8); border-radius: 0 4px 4px 0; position: relative;">
              <div class="showcase-val-label-horizontal" style="position: absolute; right: -24px; top: 50%; transform: translateY(-50%); font-size: 0.8rem; font-weight: 800; color: #f8fafc;">${item.val}</div>
            </div>
          `;
          wrapper.appendChild(row);
        });
      } else {
        container.style.flexDirection = 'row';
        container.style.alignItems = 'flex-end';
        container.style.height = '200px';
        container.style.paddingLeft = '0';
        container.style.paddingBottom = '20px';
        container.style.borderBottom = '2px solid #cbd5e1';
        container.style.borderLeft = 'none';
        wrapper.style.display = 'flex';
        wrapper.style.width = '100%';
        wrapper.style.justifyContent = 'space-around';

        items.forEach(item => {
          const col = document.createElement('div');
          col.className = 'showcase-bar-col';
          col.style.display = 'flex';
          col.style.flexDirection = 'column';
          col.style.alignItems = 'center';
          col.style.justifyContent = 'flex-end';
          col.style.height = '100%';
          col.style.position = 'relative';

          const pct = (item.val / maxVal) * 100;
          const cleanName = stripEmoji(item.name);
          col.innerHTML = `
            <div class="showcase-bar" style="height: ${pct * 0.8}%; width: 28px; background: linear-gradient(180deg, #3b82f6, #1d4ed8); border-radius: 4px 4px 0 0; position: relative;">
              <div class="showcase-val-label" style="position: absolute; top: -20px; left: 50%; transform: translateX(-50%); font-size: 0.8rem; font-weight: 800; color: #f8fafc; white-space: nowrap;">${item.val}</div>
            </div>
            <div class="showcase-bar-name" style="position: absolute; bottom: -22px; font-size: 0.75rem; font-weight: 800; color: #cbd5e1; white-space: nowrap;">${cleanName}</div>
          `;
          wrapper.appendChild(col);
        });
      }
    }
  }

  function renderCertificate() {
    document.getElementById('cert-name-label').textContent = state.studentName;
    document.getElementById('cert-portfolio-title').textContent = state.customGraph.title;

    const today = new Date();
    document.getElementById('cert-date-display').textContent = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

    const chartWrap = document.getElementById('cert-mini-chart-wrapper');
    if (chartWrap) {
      chartWrap.innerHTML = '';
      const items = state.customGraph.items || [];
      const maxVal = Math.max(...items.map(x => x.val), 1);

      items.forEach(item => {
        const col = document.createElement('div');
        col.className = 'cert-mini-bar-col';
        col.style.display = 'flex';
        col.style.flexDirection = 'column';
        col.style.alignItems = 'center';
        col.style.justifyContent = 'flex-end';
        col.style.width = '40px';
        col.style.height = '100%';

        const pct = (item.val / maxVal) * 100;
        const cleanName = stripEmoji(item.name);
        col.innerHTML = `
          <span class="cert-mini-val" style="font-size:0.7rem; font-weight:800; margin-bottom:2px;">${item.val}</span>
          <div class="cert-mini-bar" style="height: ${pct * 0.7}px; width: 16px; background: #3b82f6; border-radius: 2px 2px 0 0; min-height: 4px;"></div>
          <span class="cert-mini-label" style="font-size:0.7rem; font-weight:800; margin-top:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; text-align:center;">${cleanName}</span>
        `;
        chartWrap.appendChild(col);
      });
    }
  }

  function renderReviewersChips() {
    const list = document.getElementById('completed-reviewers-list');
    if (!list) return;
    if (state.reviews.length === 0) {
      list.innerHTML = `<span class="no-reviewer-msg">아직 등록된 친구 코멘트가 없습니다.</span>`;
      return;
    }
    list.innerHTML = state.reviews.map(r => `
      <span class="reviewer-chip-active">📝 ${r.reviewerName} (${r.isCorrect ? '평가 성공' : '평가 완료'})</span>
    `).join('');
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
        state.activeScale31 = 1;
        state.drawing31Data = { chopsticks: 0, cup: 0, bag: 0, spoon: 0 };
        state.drawing31DataByScale = {
          1: { chopsticks: 0, cup: 0, bag: 0, spoon: 0 },
          2: { chopsticks: 8, cup: 12, bag: 6, spoon: 2 },
          5: { chopsticks: 8, cup: 12, bag: 6, spoon: 2 }
        };
        state.drawing32Data = { chopsticks: 0, cup: 0, bag: 0, spoon: 0 };
        state.step5Act1Cleared = false;
        state.step5Act2Cleared = false;
        state.step5Act3Cleared = false;
        if (typeof updateStep5TabsUI === 'function') updateStep5TabsUI();
        
        const helperBox = document.getElementById('scale-31-helper-box');
        if (helperBox) helperBox.style.display = 'none';
        state.drawing33Data = { chopsticks: 0, cup: 0, bag: 0, spoon: 0 };
        state.customGraph = {
          title: '우리 반 친구들이 가장 가보고 싶은 포천의 명소',
          unit: '표',
          items: [
            { name: '산정호수 🏞️', val: 12 },
            { name: '포천아트밸리 🎨', val: 10 },
            { name: '허브아일랜드 🌿', val: 8 },
            { name: '국립수목원 🌳', val: 6 }
          ]
        };

        document.getElementById('student-name-input').value = '';
        document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
        
        spotCheckboxes.forEach(cb => {
          const val = cb.value;
          if (['sanjeong', 'artvalley', 'herbisland', 'arboretum'].includes(val)) {
            cb.checked = true;
          } else {
            cb.checked = false;
          }
          const label = cb.closest('.spot-select-card');
          if (label) {
            if (cb.checked) label.classList.add('selected');
            else label.classList.remove('selected');
          }
        });
        updateSelectionCount();

        takeawaysList.forEach(num => {
          const item = document.getElementById(`takeaway-item-${num}`);
          if (item) item.classList.remove('checked');
        });
        const btnTakeaway = document.getElementById('btn-complete-takeaway');
        if (btnTakeaway) btnTakeaway.disabled = true;

        document.querySelectorAll('.quiz-feedback').forEach(fb => {
          fb.style.display = 'none';
          fb.textContent = '';
        });

        const countingWorkspace = document.getElementById('counting-workspace-41');
        if (countingWorkspace) countingWorkspace.style.display = 'none';
        
        const box = document.getElementById('local-board-box');
        if (box) {
          box.style.display = 'none';
          btnToggleLocalBoard.textContent = '🖥️ 화면이 안 보여요! 가상 투표판 열기';
        }

        const step42Card = document.getElementById('sub-step-4-2');
        if (step42Card) step42Card.style.display = 'none';

        const step43Card = document.getElementById('sub-step-4-3');
        if (step43Card) step43Card.style.display = 'none';

        const startScreen = document.getElementById('ebs-start-screen');
        const workspace = document.getElementById('ebs-workspace');
        if (startScreen) startScreen.style.display = 'block';
        if (workspace) workspace.style.display = 'none';
        isEbsLocked = false;
        ebsDirection = 'vertical';
        
        if (ebsScaleSelect) {
          ebsScaleSelect.value = "2";
          ebsScaleSelect.disabled = true;
        }
        if (ebsUnitInput) {
          ebsUnitInput.value = "표";
          ebsUnitInput.disabled = true;
        }
        if (btnEbsDirection) btnEbsDirection.disabled = true;
        if (btnEbsAddRow) btnEbsAddRow.disabled = false;
        if (ebsTitleInput) {
          ebsTitleInput.value = "우리 반 친구들이 가장 가보고 싶은 포천의 명소";
          ebsTitleInput.disabled = false;
        }

        const saveBtn = document.getElementById('btn-save-ebs-graph');
        if (saveBtn) saveBtn.style.display = 'none';

        const sub31 = document.getElementById('sub-step-3-1');
        const sub32 = document.getElementById('sub-step-3-2');
        const sub33 = document.getElementById('sub-step-3-3');
        if (sub31) sub31.style.display = 'block';
        if (sub32) sub32.style.display = 'none';
        if (sub33) sub33.style.display = 'none';

        const warning31 = document.getElementById('warning-31');
        const quiz31 = document.getElementById('quiz-31');
        if (warning31) warning31.style.display = 'none';
        if (quiz31) quiz31.style.display = 'none';

        const btn12 = document.getElementById('btn-go-to-12');
        const btn13 = document.getElementById('btn-go-to-13');
        const btn14 = document.getElementById('btn-go-to-14');
        const btnFinish = document.getElementById('btn-finish-step1');
        if (btn12) btn12.disabled = true;
        if (btn13) btn13.disabled = true;
        if (btn14) btn14.disabled = true;
        if (btnFinish) btnFinish.disabled = true;

        const btnGoTo32 = document.getElementById('btn-go-to-32');
        const btnGoTo33 = document.getElementById('btn-go-to-33');
        const btnNextTo4 = document.getElementById('btn-next-to-4');
        if (btnGoTo32) btnGoTo32.disabled = true;
        if (btnGoTo33) btnGoTo33.disabled = true;
        if (btnNextTo4) btnNextTo4.disabled = true;

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

        update31DrawingUI();
        update32DrawingUI();
        update33DrawingUI();
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
  } else {
    window.playConfetti = function() {};
  }
  
  const playConfetti = window.playConfetti;

  function bindInputs() {}

  // ==========================================
  // M. 초기 로딩 구동
  // ==========================================
  loadProgress();
  bindInputs();
  update31DrawingUI();
  update32DrawingUI();
  update33DrawingUI();

  } catch (e) {
    console.error("DOM 로드 후 초기화 실패:", e);
    const errBox = document.createElement('div');
    errBox.style.position = 'fixed';
    errBox.style.top = '10px';
    errBox.style.left = '10px';
    errBox.style.right = '10px';
    errBox.style.background = '#fef2f2';
    errBox.style.color = '#991b1b';
    errBox.style.border = '3px solid #ef4444';
    errBox.style.padding = '20px';
    errBox.style.borderRadius = '8px';
    errBox.style.zIndex = '1000002';
    errBox.style.fontFamily = 'monospace';
    errBox.style.fontSize = '12px';
    errBox.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
    errBox.style.pointerEvents = 'auto';
    errBox.innerHTML = '<strong>❌ 초기화 오류 감지:</strong><br>' + 
                        e.message + '<br><br>' + 
                        '<strong>Stack Trace:</strong><br>' + 
                        e.stack.replace(/\n/g, '<br>') + '<br>' +
                        '<button onclick="this.parentElement.remove()" style="margin-top: 15px; padding: 6px 12px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">닫기</button>';
    document.body.appendChild(errBox);
  }
});
