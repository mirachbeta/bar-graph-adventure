/* ==========================================
   우당탕탕 막대그래프 대모험 - 핵심 로직 JS (최종본)
   [초등학교 교육용 자료 개발 프로젝트]
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
  try {
    window.APP_JS_LOADED = true;
    
    // 수업 차시 제어: 1 = 1차시만, 2 = 2차시까지, 3 = 3차시(3단계)까지, 6 = 전체 사용
    const MAX_ENABLED_STEP = 6;
  
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
              <button class="btn-dev-jump" data-step="3">3단계</button>
              <button class="btn-dev-jump" data-step="4">4단계</button>
              <button class="btn-dev-jump" data-step="5">5단계</button>
              <button class="btn-dev-jump" data-step="6" data-sub="1">6-1</button>
              <button class="btn-dev-jump" data-step="6" data-sub="2">6-2</button>
              <button class="btn-dev-jump" data-step="6" data-sub="3">6-3</button>
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
          if (step === 3) {
            const sub31 = document.getElementById('sub-step-3-1');
            const sub32 = document.getElementById('sub-step-3-2');
            const sub33 = document.getElementById('sub-step-3-3');
            if (sub31) sub31.style.display = 'block';
            if (sub32) sub32.style.display = 'none';
            if (sub33) sub33.style.display = 'none';
            
            update31DrawingUI();
            if (sub31) {
              sub31.scrollIntoView({ behavior: 'smooth' });
            }
          }

          // Handle sub steps in step 6
          if (step === 6 && sub) {
            const sub61 = document.getElementById('sub-step-6-1');
            const sub62 = document.getElementById('sub-step-6-2');
            const sub63 = document.getElementById('sub-step-6-3');
            const sub64 = document.getElementById('sub-step-6-4');
            if (sub61) sub61.style.display = 'none';
            if (sub62) sub62.style.display = 'none';
            if (sub63) sub63.style.display = 'none';
            if (sub64) sub64.style.display = 'none';

            // Ensure selectedZone is set
            if (!state.selectedZone) {
              state.selectedZone = 'south';
            }

            const targetSub = document.getElementById(`sub-step-6-${sub}`);
            if (targetSub) {
              targetSub.style.display = 'block';
              targetSub.scrollIntoView({ behavior: 'smooth' });
            }

            if (sub === '2') {
              const zone = state.selectedZone;
              const targetCounts = ZONE_DATA[zone].counts;
              state.customGraph.items = [
                { key: 'school', name: '학교', val: targetCounts.school },
                { key: 'factory', name: '공장', val: targetCounts.factory },
                { key: 'field', name: '논', val: targetCounts.field },
                { key: 'mountain', name: '산', val: targetCounts.mountain },
                { key: 'museum', name: '명승고적', val: targetCounts.museum },
                { key: 'quarry', name: '채석장', val: targetCounts.quarry }
              ];
              state.customGraph.unit = '개';
              state.customGraph.title = '우리 구역 지도 속 기호 수';
              loadEbsTableData6();
            } else if (sub === '3') {
              const overlay = document.getElementById('teacher-guide-overlay-63');
              const workspace = document.getElementById('writing-challenge-workspace');
              if (overlay) overlay.style.display = 'none';
              if (workspace) workspace.style.display = 'block';

              const zone = state.selectedZone;
              const exampleText = getExampleSentence(zone);
              const exampleSentenceEl = document.getElementById('writing-example-sentence');
              if (exampleSentenceEl) exampleSentenceEl.textContent = exampleText;

              renderWritingMiniGraph6();

              const textarea = document.getElementById('textarea-description-63');
              if (textarea) textarea.value = '';

              const blanksBtn = document.getElementById('btn-show-blanks-hint');
              const dropdownBtn = document.getElementById('btn-switch-to-dropdown');
              if (blanksBtn) blanksBtn.style.display = 'inline-block';
              if (dropdownBtn) dropdownBtn.style.display = 'inline-block';

              const timerBadge = document.getElementById('writing-timer-badge');
              if (timerBadge) {
                timerBadge.textContent = '✔️ 도움 요청 가능';
                timerBadge.style.background = '#10b981';
              }
            }
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
            document.querySelectorAll('input[name="q5"][value="b"]').forEach(r => r.checked = true);
            const checkStep5 = document.getElementById('btn-check-step5');
            if (checkStep5) checkStep5.click();
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
      renderCertificate6();
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

  const btnNextTo5 = document.getElementById('btn-next-to-5');
  if (btnNextTo5) {
    btnNextTo5.addEventListener('click', () => {
      showPanel(5);
      updateNavigationUI();
    });
  }

  const btnNextTo6 = document.getElementById('btn-next-to-6');
  if (btnNextTo6) {
    btnNextTo6.addEventListener('click', () => {
      showPanel(6);
      updateNavigationUI();
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

  // ==========================================
  // I. 4단계: 자료 조사하여 막대그래프로 나타내기 (복원된 로직)
  // ==========================================
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
              </div></td>
          `;
          tbody.appendChild(row);
        });

        const sumRow = document.createElement('tr');
        sumRow.style.background = 'rgba(251, 191, 36, 0.1)';
        sumRow.innerHTML = `
          <td><strong>합계</strong></td>
          <td>
            <input type="number" id="table-sum-input" class="ebs-input" style="font-weight: 800; border-color: #fbbf24;" min="0" placeholder="합계 입력">
            </div></td>
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

      // Validate counts
      let isMatches = true;
      inputs.forEach(inp => {
        const key = inp.getAttribute('data-key');
        const correctVal = POCHEON_SPOTS[key].votes;
        const val = parseInt(inp.value.trim(), 10) || 0;
        if (val !== correctVal) {
          isMatches = false;
        }
      });

      if (!isMatches || calculatedSum !== typedSum) {
        feedback.innerHTML = '❌ 입력한 표의 값 또는 합계가 맞지 않습니다! 투표 결과를 다시 자세히 보고 정확하게 기재해 보세요.';
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
      item.name = SYMBOL_NAMES[item.key] || item.name;
      const row = document.createElement('tr');
      row.setAttribute('data-key', item.key);
      row.innerHTML = `
        <td><span class="ebs-row-name" style="font-weight: 800; color: #1e293b;">${item.name}</span></td>
        <td><span class="ebs-row-target-val" style="font-weight: bold; color: #0284c7;">${item.val}표</span></td>
      `;
      tbody.appendChild(row);

      state.drawnSimulatorValues[item.key] = 0;
    });

    renderEbsGraph();
  }

  // EBS adjust click listeners for Step 4
  document.addEventListener('click', (e) => {
    const upBtn = e.target.closest('.btn-ebs-adjust.ebs-up');
    const downBtn = e.target.closest('.btn-ebs-adjust.ebs-down');
    
    if (upBtn) {
      const key = upBtn.getAttribute('data-key');
      // Step 4 adjusts if key is in POCHEON_SPOTS
      if (POCHEON_SPOTS[key]) {
        state.drawnSimulatorValues[key] = (state.drawnSimulatorValues[key] || 0) + 1;
        renderEbsGraph();
      }
    }
    
    if (downBtn) {
      const key = downBtn.getAttribute('data-key');
      if (POCHEON_SPOTS[key]) {
        state.drawnSimulatorValues[key] = Math.max((state.drawnSimulatorValues[key] || 0) - 1, 0);
        renderEbsGraph();
      }
    }
  });

  const btnEbsDirection = document.getElementById('btn-ebs-direction');
  if (btnEbsDirection) {
    btnEbsDirection.addEventListener('click', () => {
      ebsDirection = ebsDirection === 'vertical' ? 'horizontal' : 'vertical';
      renderEbsGraph();
    });
  }

  const btnSaveEbsGraph = document.getElementById('btn-save-ebs-graph');
  if (btnSaveEbsGraph) {
    btnSaveEbsGraph.addEventListener('click', () => {
      const isHeightCorrect = state.customGraph.items.every(item => {
        const targetVal = item.val;
        const drawnVal = state.drawnSimulatorValues[item.key] || 0;
        return targetVal === drawnVal;
      });

      const fb = document.getElementById('feedback-ebs-42');
      if (!isHeightCorrect) {
        if (fb) {
          fb.innerHTML = '❌ 막대그래프의 높이가 표의 값과 다릅니다! 표를 보고 알맞은 높이가 되도록 [+], [-] 버튼으로 직접 그려 보세요.';
          fb.className = 'quiz-feedback error';
          fb.style.display = 'block';
        }
        return;
      }

      if (fb) {
        fb.innerHTML = '정답입니다! 🎉 막대그래프를 정확하게 그렸습니다. 이제 해석 미션 단계로 이동하세요!';
        fb.className = 'quiz-feedback success';
        fb.style.display = 'block';
      }

      const btnGoTo43 = document.getElementById('btn-go-to-43');
      if (btnGoTo43) btnGoTo43.disabled = false;
      playConfetti();
    });
  }

  function renderEbsGraph() {
    const container = document.getElementById('ebs-chart-inner');
    if (!container) return;
    container.innerHTML = '';

    const items = state.customGraph.items.map(item => {
      return {
        key: item.key,
        name: SYMBOL_NAMES[item.key] || item.name,
        val: state.drawnSimulatorValues[item.key] || 0
      };
    });

    const scale = parseInt(document.getElementById('ebs-scale-select').value, 10) || 1;
    const maxVal = Math.max(...state.customGraph.items.map(x => x.val), 1);
    const divisions = Math.max(Math.ceil(maxVal / scale), 5);
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
        if (i % 5 === 0) line.classList.add('major');
        line.style.bottom = `${pct}%`;
        container.appendChild(line);
      }

      const yLabelBox = document.createElement('div');
      yLabelBox.className = 'ebs-y-label-box';
      for (let i = divisions; i >= 0; i--) {
        const labelDiv = document.createElement('div');
        if (i % 5 === 0 || divisions <= 10) {
          labelDiv.textContent = i * scale;
        } else {
          labelDiv.textContent = '';
        }
        yLabelBox.appendChild(labelDiv);
      }
      container.appendChild(yLabelBox);

      const xLabelBox = document.createElement('div');
      xLabelBox.className = 'ebs-x-label-box';
      items.forEach(item => {
        const labelDiv = document.createElement('div');
        labelDiv.textContent = item.name;
        labelDiv.style.flex = '1';
        labelDiv.style.textAlign = 'center';
        xLabelBox.appendChild(labelDiv);
      });
      container.appendChild(xLabelBox);

      // axis titles
      const axisLabelY = document.createElement('div');
      axisLabelY.className = 'ebs-axis-label-y';
      axisLabelY.textContent = '개수';
      container.appendChild(axisLabelY);

      const axisLabelX = document.createElement('div');
      axisLabelX.className = 'ebs-axis-label-x';
      axisLabelX.textContent = '기호';
      container.appendChild(axisLabelX);

      const barsWrapper = document.createElement('div');
      barsWrapper.className = 'ebs-bars-wrapper';
      items.forEach(item => {
        const col = document.createElement('div');
        col.className = 'ebs-bar-col';
        col.style.flex = '1';

        const pct = (item.val / limit) * 100;
        col.innerHTML = `
          <div class="ebs-bar" style="height: ${pct}%; width: 22px; background-color: #f59e0b; border-radius: 4px 4px 0 0; position: relative; transition: height 0.2s ease;">
            <div class="ebs-bar-val-label" style="color: #cbd5e1; font-weight:800;">${item.val}</div>
          </div>
          <div class="ebs-bar-adjust" style="position: absolute; top: -35px; display: flex; gap: 2px; z-index: 10;">
            <button class="btn-ebs-adjust ebs-up" data-key="${item.key}" style="width: 18px; height: 18px; font-weight: bold; border-radius: 50%; border: 1px solid #cbd5e1; background: #e2e8f0; color: #1e293b; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.75rem;">+</button>
            <button class="btn-ebs-adjust ebs-down" data-key="${item.key}" style="width: 18px; height: 18px; font-weight: bold; border-radius: 50%; border: 1px solid #cbd5e1; background: #e2e8f0; color: #1e293b; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.75rem;">-</button>
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
        if (i % 5 === 0) line.classList.add('major');
        line.style.left = `${pct}%`;
        container.appendChild(line);
      }

      const xLabelBoxHorizontal = document.createElement('div');
      xLabelBoxHorizontal.className = 'ebs-x-label-box-horizontal';
      for (let i = 0; i <= divisions; i++) {
        const labelDiv = document.createElement('div');
        if (i % 5 === 0 || divisions <= 10) {
          labelDiv.textContent = i * scale;
        } else {
          labelDiv.textContent = '';
        }
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
        labelDiv.textContent = item.name;
        labelDiv.style.height = `${100 / items.length}%`;
        labelDiv.style.display = 'flex';
        labelDiv.style.alignItems = 'center';
        labelDiv.style.justifyContent = 'flex-end';
        yLabelBoxHorizontal.appendChild(labelDiv);
      });
      container.appendChild(yLabelBoxHorizontal);

      const axisLabelY = document.createElement('div');
      axisLabelY.className = 'ebs-axis-label-y-horizontal';
      axisLabelY.textContent = '기호';
      container.appendChild(axisLabelY);

      const axisLabelX = document.createElement('div');
      axisLabelX.className = 'ebs-axis-label-x-horizontal';
      axisLabelX.textContent = '개수';
      container.appendChild(axisLabelX);

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
          <div class="ebs-bar-horizontal" style="width: ${pct}%; height: 14px; background-color: #f59e0b; border-radius: 0 3px 3px 0; position: relative; transition: width 0.2s ease;">
            <div class="ebs-bar-val-label-horizontal" style="color: #cbd5e1; font-weight:800;">${item.val}</div>
          </div>
          <div class="ebs-bar-adjust-horizontal" style="position: absolute; right: -60px; display: flex; gap: 4px; z-index: 10;">
            <button class="btn-ebs-adjust ebs-up" data-key="${item.key}" style="width: 18px; height: 18px; font-weight: bold; border-radius: 50%; border: 1px solid #cbd5e1; background: #e2e8f0; color: #1e293b; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.75rem;">+</button>
            <button class="btn-ebs-adjust ebs-down" data-key="${item.key}" style="width: 18px; height: 18px; font-weight: bold; border-radius: 50%; border: 1px solid #cbd5e1; background: #e2e8f0; color: #1e293b; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.75rem;">-</button>
          </div>
        `;
        barsWrapperHorizontal.appendChild(row);
      });
      container.appendChild(barsWrapperHorizontal);
    }
  }

  const btnGoTo43 = document.getElementById('btn-go-to-43');
  if (btnGoTo43) {
    btnGoTo43.addEventListener('click', () => {
      const card42 = document.getElementById('sub-step-4-2');
      const card43 = document.getElementById('sub-step-4-3');
      if (card42) card42.style.display = 'none';
      if (card43) {
        card43.style.display = 'block';
        renderQ43Options();
        renderQ43PreviewGraph();
        card43.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  const btnBackTo41 = document.getElementById('btn-back-to-41');
  if (btnBackTo41) {
    btnBackTo41.addEventListener('click', () => {
      const card42 = document.getElementById('sub-step-4-2');
      const card41 = document.getElementById('sub-step-4-1');
      if (card42) card42.style.display = 'none';
      if (card41) {
        card41.style.display = 'block';
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

  function renderQ43Options() {
    const q1Options = document.getElementById('q43-q1-options');
    if (!q1Options) return;
    q1Options.innerHTML = '';

    state.customGraph.items.forEach((item, idx) => {
      const label = document.createElement('label');
      label.innerHTML = `
        <input type="radio" name="q43_1" value="${item.key}">
        ${item.name} (${item.val}표)
      `;
      q1Options.appendChild(label);
    });
  }

  function renderQ43PreviewGraph() {
    const wrapper = document.getElementById('q43-bars-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = '';

    const items = state.customGraph.items || [];
    if (items.length === 0) return;

    const maxVal = Math.max(...items.map(x => x.val), 1);
    
    items.forEach(item => {
      const col = document.createElement('div');
      col.className = 'showcase-bar-col';
      
      const pct = (item.val / maxVal) * 100;
      col.innerHTML = `
        <div class="showcase-bar" style="height: ${pct * 0.7}px; width: 24px; background: linear-gradient(180deg, #3b82f6, #1d4ed8); border-radius: 4px 4px 0 0; position:relative;">
          <div class="showcase-val-label" style="position:absolute; top:-20px; left:50%; transform:translateX(-50%); font-size:0.75rem; font-weight:800;">${item.val}</div>
        </div>
        <div class="showcase-bar-name" style="font-size:0.75rem; font-weight:800; color:#cbd5e1; margin-top:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:60px; text-align:center;">${stripEmoji(item.name)}</div>
      `;
      wrapper.appendChild(col);
    });
  }
  const btnCheckSub43 = document.getElementById('btn-check-sub43');
  if (btnCheckSub43) {
    btnCheckSub43.addEventListener('click', () => {
      const q1Selected = document.querySelector('input[name="q43_1"]:checked');
      const q2Selected = document.querySelector('input[name="q43_2"]:checked');
      const q3Selected = document.querySelector('input[name="q43_3"]:checked');
      const fb = document.getElementById('feedback-sub43');

      if (!q1Selected || !q2Selected || !q3Selected) {
        fb.textContent = '⚠️ 세 질문 모두 답변을 선택해 주세요!';
        fb.className = 'quiz-feedback error';
        fb.style.display = 'block';
        return;
      }

      // Find spot with maximum votes
      const sorted = [...state.customGraph.items].sort((a,b) => b.val - a.val);
      const correctQ1Key = sorted[0].key;
      const isQ1Correct = q1Selected.value === correctQ1Key;
      const isQ2Correct = q2Selected.value === 'a';
      const isQ3Correct = q3Selected.value === 'b';

      if (isQ1Correct && isQ2Correct && isQ3Correct) {
        fb.innerHTML = '모두 정답입니다! 🎉 4단계를 완벽하게 클리어하셨습니다! 다음 5단계로 이동하세요.';
        fb.className = 'quiz-feedback success';
        fb.style.display = 'block';
        playConfetti();

        const btnNextTo5 = document.getElementById('btn-next-to-5');
        if (btnNextTo5) btnNextTo5.disabled = false;
        unlockNext(4);
      } else {
        let errStr = '❌ 오답이 있습니다. 다시 그래프를 꼼꼼하게 읽어 보세요!<br>';
        if (!isQ1Correct) errStr += '- <strong>Q1</strong>: 그래프에서 가장 높은 막대의 명소를 골라주세요.<br>';
        if (!isQ2Correct) errStr += '- <strong>Q2</strong>: 그래프 방향을 가로로 바꾸면 축의 가로/세로 내용도 바뀝니다.<br>';
        if (!isQ3Correct) errStr += '- <strong>Q3</strong>: 그래프 방향이 바뀌어도 막대 고유의 길이나 실제 투표 수는 변하지 않습니다.';
        fb.innerHTML = errStr;
        fb.className = 'quiz-feedback error';
        fb.style.display = 'block';
      }
    });
  }

  // ==========================================
  // L. 6단계: 우리 지역 포천 탐구 (구조 개편 및 지도 연동)
  // ==========================================
  const DEFAULT_PADLET_URL = 'https://padlet.com/mirach92/padlet-ynm9xca0hdwjpqe3';
  state.selectedZone = 'south';
  state.usedHelper = false;
  state.drawnSimulatorValues6 = {};
  let ebsDirection6 = 'vertical';

  const ZONE_DATA = {
    south: {
      name: "남부 구역",
      bg: "#e0f2fe",
      pins: [
        { type: "school", x: 20, y: 73 }, { type: "school", x: 28, y: 81 }, { type: "school", x: 28, y: 73 },
        { type: "field", x: 35, y: 67 }, { type: "school", x: 24, y: 67 }, { type: "mountain", x: 38, y: 82 },
        { type: "school", x: 16, y: 95 }, { type: "field", x: 20, y: 94 }, { type: "school", x: 18, y: 88 },
        { type: "factory", x: 20, y: 81 }, { type: "factory", x: 24, y: 77 }, { type: "factory", x: 35, y: 72 },
        { type: "factory", x: 18, y: 67 }, { type: "factory", x: 28, y: 88 }, { type: "factory", x: 34, y: 80 },
        { type: "factory", x: 23, y: 86 },
        { type: "field", x: 29, y: 67 }, { type: "field", x: 16, y: 83 },
        { type: "mountain", x: 22, y: 91 },
        { type: "museum", x: 24, y: 69 }, { type: "museum", x: 24, y: 82 },
        { type: "quarry", x: 32, y: 84 }
      ],
      counts: { school: 6, factory: 7, field: 4, mountain: 2, museum: 2, quarry: 1 }
    },
    north: {
      name: "북부 구역",
      bg: "#dcfce7",
      pins: [
        { type: "school", x: 35, y: 28 }, { type: "school", x: 65, y: 32 },
        { type: "factory", x: 31, y: 38 },
        { type: "field", x: 25, y: 30 }, { type: "field", x: 30, y: 22 }, { type: "field", x: 61, y: 38 }, { type: "field", x: 72, y: 34 },
        { type: "mountain", x: 28, y: 8 }, { type: "mountain", x: 48, y: 12 }, { type: "mountain", x: 52, y: 6 },
        { type: "mountain", x: 72, y: 19 }, { type: "school", x: 82, y: 22 }, { type: "mountain", x: 78, y: 28 },
        { type: "mountain", x: 42, y: 24 }, { type: "mountain", x: 55, y: 20 },
        { type: "museum", x: 48, y: 32 }, { type: "museum", x: 62, y: 25 },
        { type: "quarry", x: 43, y: 33 }
      ],
      counts: { school: 3, factory: 1, field: 4, mountain: 7, museum: 2, quarry: 1 }
    },
    middle: {
      name: "중부 구역",
      bg: "#ffedd5",
      pins: [
        { type: "school", x: 30, y: 56 },
        { type: "factory", x: 22, y: 53 }, { type: "factory", x: 52, y: 48 }, { type: "factory", x: 52, y: 83 },
        { type: "field", x: 19, y: 59 }, { type: "field", x: 52, y: 58 }, { type: "field", x: 65, y: 55 }, { type: "field", x: 72, y: 48 },
        { type: "mountain", x: 80, y: 45 }, { type: "mountain", x: 76, y: 58 },
        { type: "museum", x: 11, y: 51 }, { type: "museum", x: 28, y: 54 }, { type: "museum", x: 36, y: 58 },
        { type: "museum", x: 45, y: 45 }, { type: "school", x: 58, y: 42 }, { type: "museum", x: 62, y: 62 }, { type: "school", x: 50, y: 78 }, { type: "museum", x: 51, y: 90 },
        { type: "quarry", x: 15, y: 62 }, { type: "quarry", x: 18, y: 48 }, { type: "quarry", x: 29, y: 62 }, { type: "quarry", x: 41, y: 62 }, { type: "quarry", x: 52, y: 66 }
      ],
      counts: { school: 3, factory: 3, field: 4, mountain: 2, museum: 6, quarry: 5 }
    }
  };

  const MAP_SVGS = {
    south: "",
    north: "",
    middle: ""
  };

  const SYMBOL_EMOJIS = {
    school: "🏫",
    factory: "🏭",
    field: "🌾",
    mountain: "⛰️",
    museum: "🎨",
    quarry: "⛏️"
  };

  const SYMBOL_SVGS = {
    school: `<svg viewBox="0 0 40 40" width="20" height="20" style="display:block;">
      <line x1="15" y1="6" x2="15" y2="34" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round"/>
      <polygon points="15,7 32,7 32,19 15,19" fill="#0f172a" stroke="#0f172a" stroke-width="1" stroke-linejoin="round"/>
      <line x1="8" y1="34" x2="22" y2="34" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round"/>
    </svg>`,
    factory: `<svg viewBox="0 0 40 40" width="20" height="20" style="display:block;">
      <g fill="#0f172a">
        <path d="M 18,5 L 22,5 L 23,11 L 17,11 Z"/>
        <path d="M 18,5 L 22,5 L 23,11 L 17,11 Z" transform="rotate(45 20 20)"/>
        <path d="M 18,5 L 22,5 L 23,11 L 17,11 Z" transform="rotate(90 20 20)"/>
        <path d="M 18,5 L 22,5 L 23,11 L 17,11 Z" transform="rotate(135 20 20)"/>
        <path d="M 18,5 L 22,5 L 23,11 L 17,11 Z" transform="rotate(180 20 20)"/>
        <path d="M 18,5 L 22,5 L 23,11 L 17,11 Z" transform="rotate(225 20 20)"/>
        <path d="M 18,5 L 22,5 L 23,11 L 17,11 Z" transform="rotate(270 20 20)"/>
        <path d="M 18,5 L 22,5 L 23,11 L 17,11 Z" transform="rotate(315 20 20)"/>
      </g>
      <circle cx="20" cy="20" r="11" fill="none" stroke="#0f172a" stroke-width="3"/>
      <circle cx="20" cy="20" r="5" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
    </svg>`,
    field: `<svg viewBox="0 0 40 40" width="20" height="20" style="display:block;">
      <path d="M 6,17 L 14,17 M 8,17 L 8,11 M 12,17 L 12,11 M 16,17 L 24,17 M 18,17 L 18,11 M 22,17 L 22,11 M 26,17 L 34,17 M 28,17 L 28,11 M 32,17 L 32,11 M 11,29 L 19,29 M 13,29 L 13,23 M 17,29 L 17,23 M 21,29 L 29,29 M 23,29 L 23,23 M 27,29 L 27,23" stroke="#0ea5e9" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    </svg>`,
    mountain: `<svg viewBox="0 0 40 40" width="20" height="20" style="display:block;">
      <polygon points="20,8 6,32 34,32" fill="#0f172a"/>
    </svg>`,
    museum: `<svg viewBox="0 0 40 40" width="20" height="20" style="display:block;">
      <circle cx="20" cy="12" r="3.5" fill="#ef4444"/>
      <circle cx="11" cy="28" r="3.5" fill="#ef4444"/>
      <circle cx="29" cy="28" r="3.5" fill="#ef4444"/>
    </svg>`,
    quarry: `<svg viewBox="0 0 40 40" width="20" height="20" style="display:block;">
      <path d="M 12.2 27.8 A 11 11 0 1 1 27.8 27.8" fill="none" stroke="#c2410c" stroke-width="3" stroke-linecap="round"/>
      <line x1="12.2" y1="27.8" x2="14.3" y2="25.7" stroke="#c2410c" stroke-width="2" stroke-linecap="round"/>
      <line x1="9.4" y1="22.8" x2="12.3" y2="22.1" stroke="#c2410c" stroke-width="2" stroke-linecap="round"/>
      <line x1="9" y1="20" x2="12" y2="20" stroke="#c2410c" stroke-width="2" stroke-linecap="round"/>
      <line x1="9.4" y1="17.2" x2="12.3" y2="17.9" stroke="#c2410c" stroke-width="2" stroke-linecap="round"/>
      <line x1="12.2" y1="12.2" x2="14.3" y2="14.3" stroke="#c2410c" stroke-width="2" stroke-linecap="round"/>
      <line x1="17.2" y1="9.4" x2="17.9" y2="12.3" stroke="#c2410c" stroke-width="2" stroke-linecap="round"/>
      <line x1="20" y1="9" x2="20" y2="12" stroke="#c2410c" stroke-width="2" stroke-linecap="round"/>
      <line x1="22.8" y1="9.4" x2="22.1" y2="12.3" stroke="#c2410c" stroke-width="2" stroke-linecap="round"/>
      <line x1="27.8" y1="12.2" x2="25.7" y2="14.3" stroke="#c2410c" stroke-width="2" stroke-linecap="round"/>
      <line x1="30.6" y1="17.2" x2="27.7" y2="17.9" stroke="#c2410c" stroke-width="2" stroke-linecap="round"/>
      <line x1="31" y1="20" x2="28" y2="20" stroke="#c2410c" stroke-width="2" stroke-linecap="round"/>
      <line x1="30.6" y1="22.8" x2="27.7" y2="22.1" stroke="#c2410c" stroke-width="2" stroke-linecap="round"/>
      <line x1="27.8" y1="27.8" x2="25.7" y2="25.7" stroke="#c2410c" stroke-width="2" stroke-linecap="round"/>
    </svg>`
  };

  const SYMBOL_CODES = {
    school: "",
    factory: "",
    field: "",
    mountain: "",
    museum: "",
    quarry: ""
  };

  const SYMBOL_NAMES = {
    school: "학교",
    factory: "공장",
    field: "논",
    mountain: "산",
    museum: "명승고적",
    quarry: "채석장"
  };

  // 6-1. 구역 버튼 클릭 시 지도 렌더링
  function selectZone(zone) {
    state.selectedZone = zone;
    const zoneButtons = document.querySelectorAll('.btn-zone-select');
    zoneButtons.forEach(btn => {
      if (btn.getAttribute('data-zone') === zone) {
        btn.classList.add('active');
        btn.style.background = '#3b82f6';
        btn.style.color = '#ffffff';
        btn.style.borderColor = '#3b82f6';
      } else {
        btn.classList.remove('active');
        btn.style.background = '#1e293b';
        btn.style.color = '#f8fafc';
        btn.style.borderColor = 'rgba(255,255,255,0.15)';
      }
    });
    initDetailedMap6(zone);
  }

  const zoneButtons = document.querySelectorAll('.btn-zone-select');
  zoneButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const zone = btn.getAttribute('data-zone');
      selectZone(zone);
    });
  });

  function initDetailedMap6(zone) {
    const title = document.getElementById('exploration-map-title');
    if (title) {
      title.textContent = `포천시 ${ZONE_DATA[zone].name} 지도`;
    }

    const wrapper = document.getElementById('interactive-map-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = '';
    wrapper.style.background = '#ffffff';

    // Zoom parameters optimized via translate-first translation and scale centering
    const zoomConfig = {
      south: { scale: 2.2, tx: '46%', ty: '-68%' }, // Slightly larger scale and pushed further up-right
      north: { scale: 1.4, tx: '0%', ty: '28%' },   // Keep North unchanged
      middle: { scale: 1.3, tx: '7%', ty: '-18%' }   // Moved slightly more right (to the right)
    };
    const currentZoom = zoomConfig[zone] || { scale: 1.0, tx: '0%', ty: '0%' };

    // Container to keep map image and pins perfectly aligned
    const mapInner = document.createElement('div');
    mapInner.className = 'map-inner-container';
    // Position target region to the absolute center of viewport, then scale it
    mapInner.style.cssText = `position: relative; height: 100%; display: inline-block; aspect-ratio: 918/1437; max-width: 100%; margin: 0 auto; transform: translate(${currentZoom.tx}, ${currentZoom.ty}) scale(${currentZoom.scale}); transform-origin: center; transition: transform 0.6s ease-in-out;`;

    // Render PPTX exported map image
    const img = document.createElement('img');
    img.src = `images/${zone}_zone.png`;
    img.style.cssText = 'height: 100%; width: auto; display: block; object-fit: contain; pointer-events: none;';
    mapInner.appendChild(img);
    wrapper.appendChild(mapInner);

    // Add Compass Rose (방위표) to wrapper (fixed position, does not zoom)
    const compass = document.createElement('div');
    compass.className = 'map-compass';
    compass.style.cssText = 'position: absolute; top: 15px; right: 15px; width: 55px; height: 55px; display: flex; align-items: center; justify-content: center; z-index: 10; cursor: pointer; user-select: none; transition: transform 0.2s; filter: drop-shadow(0px 1px 2px rgba(255,255,255,0.8)) drop-shadow(0px 1px 3px rgba(0,0,0,0.15));';
    compass.innerHTML = `<svg viewBox="0 0 100 100" width="100%" height="100%">
      <line x1="50" y1="20" x2="50" y2="80" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
      <line x1="28" y1="50" x2="72" y2="50" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
      <line x1="50" y1="28" x2="28" y2="50" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
      <text x="50" y="11" font-size="14" font-weight="bold" text-anchor="middle" fill="#1e293b" font-family="sans-serif">북</text>
      <text x="50" y="93" font-size="14" font-weight="bold" text-anchor="middle" fill="#1e293b" font-family="sans-serif">남</text>
      <text x="85" y="55" font-size="14" font-weight="bold" text-anchor="middle" fill="#1e293b" font-family="sans-serif">동</text>
      <text x="15" y="55" font-size="14" font-weight="bold" text-anchor="middle" fill="#1e293b" font-family="sans-serif">서</text>
    </svg>`;
    compass.title = '방위표';
    compass.addEventListener('click', () => {
      compass.style.transform = 'scale(1.25)';
      setTimeout(() => { compass.style.transform = 'scale(1)'; }, 200);
    });
    wrapper.appendChild(compass);

    // Add Legend (범례) to wrapper (fixed position, does not zoom)
    const legend = document.createElement('div');
    legend.className = 'map-legend';
    legend.style.cssText = 'position: absolute; bottom: 10px; left: 10px; background: rgba(255, 255, 255, 0.95); border: 2px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 14px; font-size: 0.72rem; z-index: 10; font-weight: bold; box-shadow: 0 3px 6px rgba(0,0,0,0.1); width: 340px;';
    legend.innerHTML = `
      <div style="display:flex; align-items:center; gap:6px;">${SYMBOL_SVGS.school} <span style="color:#0f172a; white-space:nowrap;">학교</span></div>
      <div style="display:flex; align-items:center; gap:6px;">${SYMBOL_SVGS.factory} <span style="color:#0f172a; white-space:nowrap;">공장</span></div>
      <div style="display:flex; align-items:center; gap:6px;">${SYMBOL_SVGS.field} <span style="color:#0f172a; white-space:nowrap;">논</span></div>
      <div style="display:flex; align-items:center; gap:6px;">${SYMBOL_SVGS.mountain} <span style="color:#0f172a; white-space:nowrap;">산</span></div>
      <div style="display:flex; align-items:center; gap:6px;">${SYMBOL_SVGS.museum} <span style="color:#0f172a; white-space:nowrap;">명승고적</span></div>
      <div style="display:flex; align-items:center; gap:6px;">${SYMBOL_SVGS.quarry} <span style="color:#0f172a; white-space:nowrap;">채석장</span></div>
    `;
    wrapper.appendChild(legend);

    // Render pins inside mapInner (they scale relative to map, but size is compensated)
    const pinScale = 1.0 / currentZoom.scale;
    ZONE_DATA[zone].pins.forEach((pin, idx) => {
      const pinDiv = document.createElement('div');
      pinDiv.className = 'map-pin';
      // Use compensated scale to prevent pins from becoming excessively large or blurry when zoomed in
      pinDiv.style.cssText = `position: absolute; left: ${pin.x}%; top: ${pin.y}%; cursor: pointer; z-index: 5; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background: rgba(255, 255, 255, 0.9); border: 2px solid #475569; box-shadow: 0 2px 4px rgba(0,0,0,0.15); user-select: none; transform: translate(-50%, -50%) scale(${pinScale}); transform-origin: center; transition: transform 0.15s ease-in-out;`;
      pinDiv.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:center; width:20px; height:20px;">
          ${SYMBOL_SVGS[pin.type]}
        </div>
        <span class="checkmark" style="position: absolute; top: -7px; right: -7px; font-size: 0.7rem; background: #10b981; color: white; border: 1px solid white; border-radius: 50%; width: 15px; height: 15px; display: none; align-items: center; justify-content: center; font-weight: bold; z-index: 10;">✔</span>
      `;

      pinDiv.addEventListener('click', () => {
        const check = pinDiv.querySelector('.checkmark');
        if (pinDiv.classList.contains('checked')) {
          pinDiv.classList.remove('checked');
          pinDiv.style.transform = `translate(-50%, -50%) scale(${pinScale})`;
          if (check) check.style.display = 'none';
        } else {
          pinDiv.classList.add('checked');
          pinDiv.style.transform = `translate(-50%, -50%) scale(${pinScale * 1.25})`;
          if (check) check.style.display = 'flex';
        }
      });
      mapInner.appendChild(pinDiv);
    });

    // Clear previous inputs
    document.querySelectorAll('.table-map-input').forEach(inp => inp.value = '');
    const sumInp = document.getElementById('table-map-sum-input');
    if (sumInp) sumInp.value = '';
    const fb = document.getElementById('feedback-table-61');
    if (fb) fb.style.display = 'none';
  }

  // Initialize detailed map for South on first load
  initDetailedMap6('south');

  // 6-1. 표 검증
  const btnCheckTable61 = document.getElementById('btn-check-table-61');
  if (btnCheckTable61) {
    btnCheckTable61.addEventListener('click', () => {
      const inputs = document.querySelectorAll('.table-map-input');
      const sumInput = document.getElementById('table-map-sum-input');
      const feedback = document.getElementById('feedback-table-61');
      const zone = state.selectedZone;
      const targetCounts = ZONE_DATA[zone].counts;

      let hasEmpty = false;
      let calculatedSum = 0;
      let values = [];
      let inputMap = {};

      inputs.forEach(inp => {
        const valStr = inp.value.trim();
        if (valStr === '') hasEmpty = true;
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

      // Validate counts
      let isMatches = true;
      inputs.forEach(inp => {
        const key = inp.getAttribute('data-key');
        const correctVal = targetCounts[key];
        const val = parseInt(inp.value.trim(), 10) || 0;
        if (val !== correctVal) {
          isMatches = false;
        }
      });

      if (!isMatches || calculatedSum !== typedSum) {
        feedback.innerHTML = '❌ 입력한 기호 수 또는 합계가 지도 조사 결과와 맞지 않습니다! 지도의 기호 개수(체크마크 도우미 참고)를 다시 정확하게 세어 보세요.';
        feedback.className = 'quiz-feedback error';
        feedback.style.display = 'block';
        return;
      }

      // If correct
      state.customGraph.items = [
        { key: 'school', name: '학교', val: targetCounts.school },
        { key: 'factory', name: '공장', val: targetCounts.factory },
        { key: 'field', name: '논', val: targetCounts.field },
        { key: 'mountain', name: '산', val: targetCounts.mountain },
        { key: 'museum', name: '명승고적', val: targetCounts.museum },
        { key: 'quarry', name: '채석장', val: targetCounts.quarry }
      ];
      state.customGraph.unit = '개';
      state.customGraph.title = '우리 구역 지도 속 기호 수';

      feedback.innerHTML = '정답입니다! 🎉 기호 개수를 모두 정확하게 기록했습니다. 이제 6-2단계 막대그래프 그리기 도구로 그래프를 그려봅시다!';
      feedback.className = 'quiz-feedback success';
      feedback.style.display = 'block';
      playConfetti();

      const step61Card = document.getElementById('sub-step-6-1');
      if (step61Card) step61Card.style.display = 'none';

      const step62Card = document.getElementById('sub-step-6-2');
      if (step62Card) {
        step62Card.style.display = 'block';
        loadEbsTableData6();
        step62Card.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // 6-2. 막대그래프 그리기 도구 로드
  function loadEbsTableData6() {
    const tbody = document.getElementById('ebs-table-body-6');
    if (!tbody) return;
    tbody.innerHTML = '';

    state.customGraph.items.forEach(item => {
      item.name = SYMBOL_NAMES[item.key] || item.name;
      // Sanitize name to prevent loading corrupted/old name from localStorage
      item.name = SYMBOL_NAMES[item.key] || item.name;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="font-weight: 800; color: #1e293b; padding: 4px 8px;">
          <div style="display: flex; align-items: center; gap: 8px; height: 36px;">
          ${SYMBOL_SVGS[item.key]}
          <span>${SYMBOL_NAMES[item.key]}</span>
          </div></td>
        <td style="padding: 4px 8px; vertical-align: middle;"><span style="font-weight: bold; color: #0284c7;">${item.val}개</span></td>
      `;
      tbody.appendChild(row);

      state.drawnSimulatorValues6[item.key] = 0;
    });

    renderEbsGraph6();
  }

  function renderEbsGraph6() {
    const container = document.getElementById('ebs-chart-inner-6');
    if (!container) return;
    container.innerHTML = '';

    const items = state.customGraph.items.map(item => {
      return {
        key: item.key,
        name: SYMBOL_NAMES[item.key] || item.name,
        val: state.drawnSimulatorValues6[item.key] || 0
      };
    });

    const scale = parseInt(document.getElementById('ebs-scale-select-6').value, 10) || 1;
    const maxVal = Math.max(...state.customGraph.items.map(x => x.val), 1);
    const divisions = Math.max(Math.ceil(maxVal / scale), 5);
    const limit = divisions * scale;

    const axisY = document.createElement('div');
    axisY.className = 'ebs-axis-y';
    container.appendChild(axisY);

    const axisX = document.createElement('div');
    axisX.className = 'ebs-axis-x';
    container.appendChild(axisX);

    if (ebsDirection6 === 'vertical') {
      container.classList.remove('ebs-mode-horizontal');

      for (let i = 0; i <= divisions; i++) {
        const pct = (i / divisions) * 100;
        const line = document.createElement('div');
        line.className = 'ebs-grid-line';
        if (i % 5 === 0) line.classList.add('major');
        line.style.bottom = `${pct}%`;
        container.appendChild(line);
      }

      const yLabelBox = document.createElement('div');
      yLabelBox.className = 'ebs-y-label-box';
      for (let i = divisions; i >= 0; i--) {
        const labelDiv = document.createElement('div');
        if (i % 5 === 0 || divisions <= 10) {
          labelDiv.textContent = i * scale;
        } else {
          labelDiv.textContent = '';
        }
        yLabelBox.appendChild(labelDiv);
      }
      container.appendChild(yLabelBox);

      const xLabelBox = document.createElement('div');
      xLabelBox.className = 'ebs-x-label-box';
      items.forEach(item => {
        const labelDiv = document.createElement('div');
        labelDiv.textContent = item.name;
        labelDiv.style.flex = '1';
        labelDiv.style.textAlign = 'center';
        xLabelBox.appendChild(labelDiv);
      });
      container.appendChild(xLabelBox);

      // axis titles
      const axisLabelY = document.createElement('div');
      axisLabelY.className = 'ebs-axis-label-y';
      axisLabelY.textContent = '개수';
      container.appendChild(axisLabelY);

      const axisLabelX = document.createElement('div');
      axisLabelX.className = 'ebs-axis-label-x';
      axisLabelX.textContent = '기호';
      container.appendChild(axisLabelX);

      const barsWrapper = document.createElement('div');
      barsWrapper.className = 'ebs-bars-wrapper';
      items.forEach(item => {
        const col = document.createElement('div');
        col.className = 'ebs-bar-col';
        col.style.flex = '1';

        const pct = (item.val / limit) * 100;
        col.innerHTML = `
          <div class="ebs-bar" style="height: ${pct}%; width: 22px; background-color: #f59e0b; border-radius: 4px 4px 0 0; position: relative; transition: height 0.2s ease;">
            <div class="ebs-bar-val-label" style="color: #cbd5e1; font-weight:800;">${item.val}</div>
          </div>
          <div class="ebs-bar-adjust" style="position: absolute; top: -35px; display: flex; gap: 2px; z-index: 10;">
            <button class="btn-ebs-adjust-6 ebs-up" data-key="${item.key}" style="width: 18px; height: 18px; font-weight: bold; border-radius: 50%; border: 1px solid #cbd5e1; background: #e2e8f0; color: #1e293b; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.75rem;">+</button>
            <button class="btn-ebs-adjust-6 ebs-down" data-key="${item.key}" style="width: 18px; height: 18px; font-weight: bold; border-radius: 50%; border: 1px solid #cbd5e1; background: #e2e8f0; color: #1e293b; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.75rem;">-</button>
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
        if (i % 5 === 0) line.classList.add('major');
        line.style.left = `${pct}%`;
        container.appendChild(line);
      }

      const xLabelBoxHorizontal = document.createElement('div');
      xLabelBoxHorizontal.className = 'ebs-x-label-box-horizontal';
      for (let i = 0; i <= divisions; i++) {
        const labelDiv = document.createElement('div');
        if (i % 5 === 0 || divisions <= 10) {
          labelDiv.textContent = i * scale;
        } else {
          labelDiv.textContent = '';
        }
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
        labelDiv.textContent = item.name;
        labelDiv.style.height = `${100 / items.length}%`;
        labelDiv.style.display = 'flex';
        labelDiv.style.alignItems = 'center';
        labelDiv.style.justifyContent = 'flex-end';
        yLabelBoxHorizontal.appendChild(labelDiv);
      });
      container.appendChild(yLabelBoxHorizontal);

      const axisLabelY = document.createElement('div');
      axisLabelY.className = 'ebs-axis-label-y-horizontal';
      axisLabelY.textContent = '기호';
      container.appendChild(axisLabelY);

      const axisLabelX = document.createElement('div');
      axisLabelX.className = 'ebs-axis-label-x-horizontal';
      axisLabelX.textContent = '개수';
      container.appendChild(axisLabelX);

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
          <div class="ebs-bar-horizontal" style="width: ${pct}%; height: 14px; background-color: #f59e0b; border-radius: 0 3px 3px 0; position: relative; transition: width 0.2s ease;">
            <div class="ebs-bar-val-label-horizontal" style="color: #cbd5e1; font-weight:800;">${item.val}</div>
          </div>
          <div class="ebs-bar-adjust-horizontal" style="position: absolute; right: -60px; display: flex; gap: 4px; z-index: 10;">
            <button class="btn-ebs-adjust-6 ebs-up" data-key="${item.key}" style="width: 18px; height: 18px; font-weight: bold; border-radius: 50%; border: 1px solid #cbd5e1; background: #e2e8f0; color: #1e293b; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.75rem;">+</button>
            <button class="btn-ebs-adjust-6 ebs-down" data-key="${item.key}" style="width: 18px; height: 18px; font-weight: bold; border-radius: 50%; border: 1px solid #cbd5e1; background: #e2e8f0; color: #1e293b; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.75rem;">-</button>
          </div>
        `;
        barsWrapperHorizontal.appendChild(row);
      });
      container.appendChild(barsWrapperHorizontal);
    }
  }

  // Clicks for adjustments in Step 6
  document.addEventListener('click', (e) => {
    const upBtn = e.target.closest('.btn-ebs-adjust-6.ebs-up');
    const downBtn = e.target.closest('.btn-ebs-adjust-6.ebs-down');

    if (upBtn) {
      const key = upBtn.getAttribute('data-key');
      const targetCounts = ZONE_DATA[state.selectedZone].counts;
      if (targetCounts[key] !== undefined) {
        state.drawnSimulatorValues6[key] = (state.drawnSimulatorValues6[key] || 0) + 1;
        renderEbsGraph6();
      }
    }

    if (downBtn) {
      const key = downBtn.getAttribute('data-key');
      const targetCounts = ZONE_DATA[state.selectedZone].counts;
      if (targetCounts[key] !== undefined) {
        state.drawnSimulatorValues6[key] = Math.max((state.drawnSimulatorValues6[key] || 0) - 1, 0);
        renderEbsGraph6();
      }
    }
  });

  const scaleSelect6 = document.getElementById('ebs-scale-select-6');
  if (scaleSelect6) {
    scaleSelect6.addEventListener('change', renderEbsGraph6);
  }

  const btnEbsDirection6 = document.getElementById('btn-ebs-direction-6');
  if (btnEbsDirection6) {
    btnEbsDirection6.addEventListener('click', () => {
      ebsDirection6 = ebsDirection6 === 'vertical' ? 'horizontal' : 'vertical';
      renderEbsGraph6();
    });
  }

  const btnSaveEbsGraph62 = document.getElementById('btn-save-ebs-graph-62');
  if (btnSaveEbsGraph62) {
    btnSaveEbsGraph62.addEventListener('click', () => {
      const targetCounts = ZONE_DATA[state.selectedZone].counts;
      const isHeightCorrect = state.customGraph.items.every(item => {
        const targetVal = targetCounts[item.key];
        const drawnVal = state.drawnSimulatorValues6[item.key] || 0;
        return targetVal === drawnVal;
      });

      const fb = document.getElementById('feedback-ebs-62');
      if (!isHeightCorrect) {
        if (fb) {
          fb.innerHTML = '❌ 막대그래프의 높이가 표의 값과 다릅니다! 표를 보고 알맞은 높이가 되도록 [+], [-] 버튼으로 직접 그려 보세요.';
          fb.className = 'quiz-feedback error';
          fb.style.display = 'block';
        }
        return;
      }

      if (fb) {
        fb.innerHTML = '정답입니다! 🎉 막대그래프를 정확하게 완성했습니다. 이제 글쓰기 도전 단계로 이동하세요!';
        fb.className = 'quiz-feedback success';
        fb.style.display = 'block';
      }

      const btnGoTo63 = document.getElementById('btn-go-to-63');
      if (btnGoTo63) btnGoTo63.disabled = false;
      playConfetti();
    });
  }

  // 6-3. 소개글 쓰기 전환 및 대기 로직
  const btnGoTo63 = document.getElementById('btn-go-to-63');
  if (btnGoTo63) {
    btnGoTo63.addEventListener('click', () => {
      const card62 = document.getElementById('sub-step-6-2');
      const card63 = document.getElementById('sub-step-6-3');
      if (card62) card62.style.display = 'none';
      if (card63) {
        card63.style.display = 'block';
        
        // Reset 6-3 UI states
        state.usedHelper = false;
        document.getElementById('teacher-guide-overlay-63').style.display = 'flex';
        document.getElementById('writing-challenge-workspace').style.display = 'none';
        
        // Example Sentence Text Setup
        const zone = state.selectedZone;
        const exampleText = getExampleSentence(zone);
        document.getElementById('writing-example-sentence').textContent = exampleText;

        // Reset Textarea
        document.getElementById('textarea-description-63').value = '';
        
        // Reset helpers bar
        document.getElementById('btn-show-blanks-hint').style.display = 'none';
        document.getElementById('btn-switch-to-dropdown').style.display = 'none';
        document.getElementById('writing-timer-badge').textContent = '⏳ 남은 시간: 60초';
        document.getElementById('writing-timer-badge').style.background = '#3b4252';

        // Render mini graph for 6-3
        renderWritingMiniGraph6();

        card63.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  function getExampleSentence(zone) {
    if (zone === 'south') {
      return "남부 구역에서 가장 많은 것은 ( )개의 ( )이고, 두 번째로 많은 것은 ( )개의 ( )입니다. 이곳은 ( )할 수 있는 지역입니다.";
    } else if (zone === 'north') {
      return "북부 구역에서 가장 많은 것은 ( )개의 ( )이고, 두 번째로 많은 것은 ( )개의 ( )입니다. 이곳은 ( )할 수 있는 지역입니다.";
    } else {
      return "중부 구역에서 가장 많은 것은 ( )개의 ( )이고, 두 번째로 많은 것은 ( )개의 ( )입니다. 이곳은 ( )할 수 있는 지역입니다.";
    }
  }

  function getBlanksHint(zone) {
    if (zone === 'south') {
      return "남부 구역에서 가장 많은 것은 ( 7 )개의 ( 공장 )이고, 두 번째로 많은 것은 ( 6 )개의 ( 학교 )입니다. 이곳은 많은 사람들이 살아가고 물건을 생산하는 활기찬 도시 지역입니다.";
    } else if (zone === 'north') {
      return "북부 구역에서 가장 많은 것은 ( 7 )개의 ( 산 )이고, 두 번째로 많은 것은 ( 4 )개의 ( 논 )입니다. 이곳은 높은 산이 많고 농사를 많이 짓는 산림 농업 지역입니다.";
    } else {
      return "중부 구역에서 가장 많은 것은 ( 6 )개의 ( 명승고적 )이고, 두 번째로 많은 것은 ( 5 )개의 ( 채석장 )입니다. 이곳은 멋진 자연유산을 감상하고, 풍부한 돌 자원을 얻을 수 있는 지질 지역입니다.";
    }
  }

  // Start challenge and Timer
  let challengeTimer = null;
  const btnStartWritingChallenge = document.getElementById('btn-start-writing-challenge');
  if (btnStartWritingChallenge) {
    btnStartWritingChallenge.addEventListener('click', () => {
      document.getElementById('teacher-guide-overlay-63').style.display = 'none';
      document.getElementById('writing-challenge-workspace').style.display = 'block';

      // Start countdown
      let remaining = 60;
      const badge = document.getElementById('writing-timer-badge');
      
      // Clear previous timer if any
      if (challengeTimer) clearInterval(challengeTimer);
      
      challengeTimer = setInterval(() => {
        remaining--;
        if (remaining > 0) {
          badge.textContent = `⏳ 남은 시간: ${remaining}초`;
        } else {
          clearInterval(challengeTimer);
          badge.textContent = `✔️ 도움 요청 가능`;
          badge.style.background = '#10b981';
          
          // Enable helpers
          document.getElementById('btn-show-blanks-hint').style.display = 'inline-block';
          document.getElementById('btn-switch-to-dropdown').style.display = 'inline-block';
        }
      }, 1000);
    });
  }

  // Blank Hint Button
  const btnShowBlanksHint = document.getElementById('btn-show-blanks-hint');
  if (btnShowBlanksHint) {
    btnShowBlanksHint.addEventListener('click', () => {
      state.usedHelper = true;
      const zone = state.selectedZone;
      document.getElementById('writing-example-sentence').textContent = getBlanksHint(zone);
      alert("도움 힌트가 열렸습니다! 예시글의 빈칸을 참고해 문장을 완성해 보세요. (마스터 배지가 격하됩니다) 💡");
    });
  }

  // Switch to Dropdown mode
  const btnSwitchToDropdown = document.getElementById('btn-switch-to-dropdown');
  if (btnSwitchToDropdown) {
    btnSwitchToDropdown.addEventListener('click', () => {
      state.usedHelper = true;
      document.getElementById('writing-mode-text').style.display = 'none';
      document.getElementById('writing-mode-dropdown').style.display = 'block';
      
      // Inject builder UI
      initDropdownSentenceBuilder6();
    });
  }

  function initDropdownSentenceBuilder6() {
    const container = document.getElementById('sentence-dropdown-builder-container');
    if (!container) return;
    
    const zone = state.selectedZone;
    if (zone === 'south') {
      container.innerHTML = `
        남부 구역에서 가장 많은 것은 
        <select id="sel-63-2" class="ebs-select-sm" style="font-size:1.1rem; font-weight:800;">
          <option value="">--선택--</option>
          <option value="1">1</option> <option value="2">2</option> <option value="4">4</option> <option value="6">6</option> <option value="7">7</option>
        </select>개의 
        <select id="sel-63-1" class="ebs-select-sm" style="font-size:1.1rem; font-weight:800; font-family:var(--font-main);">
          <option value="">--선택--</option>
          <option value="school">학교</option> <option value="factory">공장</option> <option value="field">논</option>
          <option value="mountain">산</option> <option value="museum">명승고적</option> <option value="quarry">채석장</option>
        </select>이고, 
        두 번째로 많은 것은 
        <select id="sel-63-4" class="ebs-select-sm" style="font-size:1.1rem; font-weight:800;">
          <option value="">--선택--</option>
          <option value="1">1</option> <option value="2">2</option> <option value="4">4</option> <option value="6">6</option> <option value="7">7</option>
        </select>개의 
        <select id="sel-63-3" class="ebs-select-sm" style="font-size:1.1rem; font-weight:800; font-family:var(--font-main);">
          <option value="">--선택--</option>
          <option value="school">학교</option> <option value="factory">공장</option> <option value="field">논</option>
          <option value="mountain">산</option> <option value="museum">명승고적</option> <option value="quarry">채석장</option>
        </select>입니다. 이곳에는 
        <select id="sel-63-5" class="ebs-select-sm" style="font-size:1.1rem; font-weight:800; font-family:var(--font-main);">
          <option value="">--선택--</option>
          <option value="urban">공장에서 물건을 만들거나 학교에 다니며 편리하게 생활</option>
          <option value="tourism">숲을 가꾸고 논밭에서 농사를 지으며 평화롭게 생활</option>
          <option value="industrial">자연 유산을 가꾸고 채석장에서 돌을 캐며 생활</option>
        </select>하는 사람이 많은 지역입니다.
      `;
    } else if (zone === 'north') {
      container.innerHTML = `
        북부 구역에서 가장 많은 것은 
        <select id="sel-63-2" class="ebs-select-sm" style="font-size:1.1rem; font-weight:800;">
          <option value="">--선택--</option>
          <option value="1">1</option> <option value="2">2</option> <option value="3">3</option> <option value="4">4</option> <option value="7">7</option>
        </select>개의 
        <select id="sel-63-1" class="ebs-select-sm" style="font-size:1.1rem; font-weight:800; font-family:var(--font-main);">
          <option value="">--선택--</option>
          <option value="school">학교</option> <option value="factory">공장</option> <option value="field">논</option>
          <option value="mountain">산</option> <option value="museum">명승고적</option> <option value="quarry">채석장</option>
        </select>이고, 
        두 번째로 많은 것은 
        <select id="sel-63-4" class="ebs-select-sm" style="font-size:1.1rem; font-weight:800;">
          <option value="">--선택--</option>
          <option value="1">1</option> <option value="2">2</option> <option value="3">3</option> <option value="4">4</option> <option value="7">7</option>
        </select>개의 
        <select id="sel-63-3" class="ebs-select-sm" style="font-size:1.1rem; font-weight:800; font-family:var(--font-main);">
          <option value="">--선택--</option>
          <option value="school">학교</option> <option value="factory">공장</option> <option value="field">논</option>
          <option value="mountain">산</option> <option value="museum">명승고적</option> <option value="quarry">채석장</option>
        </select>입니다. 이곳에는 
        <select id="sel-63-5" class="ebs-select-sm" style="font-size:1.1rem; font-weight:800; font-family:var(--font-main);">
          <option value="">--선택--</option>
          <option value="urban">공장에서 물건을 만들거나 학교에 다니며 편리하게 생활</option>
          <option value="tourism">숲을 가꾸고 논밭에서 농사를 지으며 평화롭게 생활</option>
          <option value="industrial">자연 유산을 가꾸고 채석장에서 돌을 캐며 생활</option>
        </select>하는 사람이 많은 지역입니다.
      `;
    } else {
      container.innerHTML = `
        중부 구역에서 가장 많은 것은 
        <select id="sel-63-2" class="ebs-select-sm" style="font-size:1.1rem; font-weight:800;">
          <option value="">--선택--</option>
          <option value="2">2</option> <option value="3">3</option> <option value="4">4</option> <option value="5">5</option> <option value="6">6</option>
        </select>개의 
        <select id="sel-63-1" class="ebs-select-sm" style="font-size:1.1rem; font-weight:800; font-family:var(--font-main);">
          <option value="">--선택--</option>
          <option value="school">학교</option> <option value="factory">공장</option> <option value="field">논</option>
          <option value="mountain">산</option> <option value="museum">명승고적</option> <option value="quarry">채석장</option>
        </select>이고, 
        두 번째로 많은 것은 
        <select id="sel-63-4" class="ebs-select-sm" style="font-size:1.1rem; font-weight:800;">
          <option value="">--선택--</option>
          <option value="2">2</option> <option value="3">3</option> <option value="4">4</option> <option value="5">5</option> <option value="6">6</option>
        </select>개의 
        <select id="sel-63-3" class="ebs-select-sm" style="font-size:1.1rem; font-weight:800; font-family:var(--font-main);">
          <option value="">--선택--</option>
          <option value="school">학교</option> <option value="factory">공장</option> <option value="field">논</option>
          <option value="mountain">산</option> <option value="museum">명승고적</option> <option value="quarry">채석장</option>
        </select>입니다. 이곳에는 
        <select id="sel-63-5" class="ebs-select-sm" style="font-size:1.1rem; font-weight:800; font-family:var(--font-main);">
          <option value="">--선택--</option>
          <option value="urban">공장에서 물건을 만들거나 학교에 다니며 편리하게 생활</option>
          <option value="tourism">숲을 가꾸고 논밭에서 농사를 지으며 평화롭게 생활</option>
          <option value="industrial">자연 유산을 가꾸고 채석장에서 돌을 캐며 생활</option>
        </select>하는 사람이 많은 지역입니다.
      `;
    }
  }

  // 6-3. 소개글 검사
  function validateTextareaDescription(zone, text) {
    const t = text.replace(/\s+/g, ""); // Remove spaces
    if (zone === 'south') {
      return (t.includes('학교') && (t.includes('9') || t.includes('아홉')) && t.includes('공장') && (t.includes('7') || t.includes('일곱')) && (t.includes('도시') || t.includes('주거')));
    } else if (zone === 'north') {
      return ((t.includes('산') || t.includes('호수')) && (t.includes('8') || t.includes('여덟')) && (t.includes('논') || t.includes('밭')) && (t.includes('4') || t.includes('네')) && (t.includes('자연') || t.includes('관광')));
    } else if (zone === 'middle') {
      return ((t.includes('체험관') || t.includes('박물관') || t.includes('미술관') || t.includes('명승고적')) && (t.includes('10') || t.includes('열')) && t.includes('채석장') && (t.includes('8') || t.includes('여덟')) && (t.includes('체험') || t.includes('문화') || t.includes('산업')));
    }
    return false;
  }

  const btnCheckDescription63 = document.getElementById('btn-check-description-63');
  if (btnCheckDescription63) {
    btnCheckDescription63.addEventListener('click', () => {
      const isDropdownMode = document.getElementById('writing-mode-dropdown').style.display === 'block';
      const feedback = document.getElementById('feedback-description-63');
      const zone = state.selectedZone;
      
      let isCorrect = false;

      if (!isDropdownMode) {
        // Textarea mode
        const text = document.getElementById('textarea-description-63').value.trim();
        if (text === '') {
          feedback.textContent = '⚠️ 빈칸으로 제출할 수 없습니다! 우리 구역의 소개글을 작성해 주세요.';
          feedback.className = 'quiz-feedback error';
          feedback.style.display = 'block';
          return;
        }

        isCorrect = true; // 줄글 모드에서는 비어 있지 않으면 무조건 자동 통과
      } else {
        // Dropdown mode
        const s1 = document.getElementById('sel-63-1').value;
        const s2 = document.getElementById('sel-63-2').value;
        const s3 = document.getElementById('sel-63-3').value;
        const s4 = document.getElementById('sel-63-4').value;
        const s5 = document.getElementById('sel-63-5').value;

        if (s1 === '' || s2 === '' || s3 === '' || s4 === '' || s5 === '') {
          feedback.textContent = '⚠️ 문장의 모든 빈칸을 선택상자로 채워 주세요!';
          feedback.className = 'quiz-feedback error';
          feedback.style.display = 'block';
          return;
        }

        if (zone === 'south') {
          isCorrect = (s1 === 'factory' && s2 === '7' && s3 === 'school' && s4 === '6' && s5 === 'urban');
        } else if (zone === 'north') {
          isCorrect = (s1 === 'mountain' && s2 === '7' && s3 === 'field' && s4 === '4' && s5 === 'tourism');
        } else {
          isCorrect = (s1 === 'museum' && s2 === '6' && s3 === 'quarry' && s4 === '5' && s5 === 'industrial');
        }
      }

      if (isCorrect) {
        feedback.innerHTML = '훌륭합니다! 🎉 우리 구역 지도의 조사 결과를 알기 쉽게 문장으로 완성하였습니다! 이제 AI 지역 홍보 포스터를 만들러 가볼까요?';
        feedback.className = 'quiz-feedback success';
        feedback.style.display = 'block';
        playConfetti();

        const btnGoTo63b = document.getElementById('btn-go-to-63b');
        if (btnGoTo63b) btnGoTo63b.disabled = false;
      } else {
        feedback.innerHTML = '❌ 오답이 있거나 기호의 개수(학교/공장 등 1등과 2등 개수)가 잘못 기재되어 있습니다. 그래프와 예시문을 다시 꼼꼼히 확인해 보세요!';
        feedback.className = 'quiz-feedback error';
        feedback.style.display = 'block';
      }
    });
  }

  // --- Activities 6-3b: Gemini AI Poster ---
  const btnGoTo63b = document.getElementById('btn-go-to-63b');
  if (btnGoTo63b) {
    btnGoTo63b.addEventListener('click', () => {
      const card63 = document.getElementById('sub-step-6-3');
      const card63b = document.getElementById('sub-step-6-3b');
      if (card63) card63.style.display = 'none';
      if (card63b) {
        card63b.style.display = 'block';
        
        // Load student introduction text as review context
        const introText = getCertificateIntroText(state.selectedZone);
        document.getElementById('poster-source-text').textContent = introText;
        
        // Generate prefilled prompt based on selected zone
        const zone = state.selectedZone || 'south';
        let promptText = '';
        if (zone === 'south') {
          promptText = `우리가 작성한 포천 남부 구역 소개글 [${introText}]을 바탕으로 포천 남부 구역을 홍보하는 멋진 포스터 이미지를 그려줘. 활기찬 공장(톱니바퀴)들과 학교들이 있는 편리한 도시의 분위기를 살려줘.`;
        } else if (zone === 'north') {
          promptText = `우리가 작성한 포천 북부 구역 소개글 [${introText}]을 바탕으로 포천 북부 구역을 홍보하는 멋진 포스터 이미지를 그려줘. 높은 푸른 산과 조용한 논밭(하늘색 풀)들이 어우러진 평화로운 시골 농촌의 분위기를 살려줘.`;
        } else {
          promptText = `우리가 작성한 포천 중부 구역 소개글 [${introText}]을 바탕으로 포천 중부 구역을 홍보하는 멋진 포스터 이미지를 그려줘. 멋진 역사 유산(빨간 점 3개)들과 돌을 캐는 채석장(원호 기호)이 있는 아름다운 지질 유산 관광지의 분위기를 살려줘.`;
        }
        document.getElementById('ai-prompt-input').value = promptText;
        
        // Reset upload view
        document.getElementById('upload-prompt-view').style.display = 'flex';
        document.getElementById('upload-preview-view').style.display = 'none';
        document.getElementById('img-poster-preview').src = '#';
        document.getElementById('btn-go-to-64-from-3b').disabled = true;
        state.posterImage = null; // Clear image state
        
        card63b.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // AI Prompt Copy and Go to Gemini AI
  const btnCopyAndGoGemini = document.getElementById('btn-copy-and-go-gemini');
  if (btnCopyAndGoGemini) {
    btnCopyAndGoGemini.addEventListener('click', () => {
      const promptValue = document.getElementById('ai-prompt-input').value;
      navigator.clipboard.writeText(promptValue).then(() => {
        alert('📋 제미나이 AI 명령어(프롬프트)가 복사되었습니다!\n\n새로 열린 제미나이 창에 [Ctrl + V]로 붙여넣은 다음, 제미나이 AI가 포스터를 완성해 주면 이미지를 다운로드 받아 아래 업로드 창에 등록해 주세요.');
        window.open('https://gemini.google.com/', '_blank');
      }).catch(err => {
        console.error('Failed to copy text: ', err);
        alert('⚠️ 복사에 실패했습니다. 명령어 상자의 텍스트를 직접 드래그해서 복사해 주세요.');
        window.open('https://gemini.google.com/', '_blank');
      });
    });
  }

  // Drag and Drop & Upload Files handlers
  const dragDropZone = document.getElementById('drag-drop-zone');
  const filePosterInput = document.getElementById('file-poster-input');
  
  if (dragDropZone && filePosterInput) {
    dragDropZone.addEventListener('click', () => {
      filePosterInput.click();
    });
    
    // Drag events
    dragDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dragDropZone.style.borderColor = '#8b5cf6';
      dragDropZone.style.background = '#f5f3ff';
    });
    
    dragDropZone.addEventListener('dragleave', () => {
      dragDropZone.style.borderColor = '#cbd5e1';
      dragDropZone.style.background = '#f8fafc';
    });
    
    dragDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dragDropZone.style.borderColor = '#cbd5e1';
      dragDropZone.style.background = '#f8fafc';
      
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handlePosterFile(e.dataTransfer.files[0]);
      }
    });
    
    filePosterInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handlePosterFile(e.target.files[0]);
      }
    });

    window.addEventListener('paste', (e) => {
      const stepCard = document.getElementById('sub-step-6-3b');
      if (!stepCard || stepCard.style.display === 'none') return;
      
      if (e.clipboardData && e.clipboardData.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (file) {
              handlePosterFile(file);
              break;
            }
          }
        }
      }
    });

    const btnFileUploadDirect = document.getElementById('btn-file-upload-direct');
    if (btnFileUploadDirect) {
      btnFileUploadDirect.addEventListener('click', (e) => {
        e.stopPropagation();
        filePosterInput.click();
      });
    }

    const btnClipboardPasteDirect = document.getElementById('btn-clipboard-paste-direct');
    if (btnClipboardPasteDirect) {
      btnClipboardPasteDirect.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          const clipboardItems = await navigator.clipboard.read();
          let imageFound = false;
          for (const item of clipboardItems) {
            const imageTypes = item.types.filter(type => type.startsWith('image/'));
            if (imageTypes.length > 0) {
              const blob = await item.getType(imageTypes[0]);
              handlePosterFile(blob);
              imageFound = true;
              break;
            }
          }
          if (!imageFound) {
            alert('📋 클립보드에 복사된 이미지가 없습니다.\n\n제미나이 AI 페이지 등에서 포스터 이미지를 마우스 오른쪽 버튼으로 클릭한 뒤 [이미지 복사]를 하고 다시 버튼을 눌러주세요!');
          }
        } catch (err) {
          console.error('Failed to read clipboard: ', err);
          alert('⚠️ 클립보드 읽기 권한이 필요합니다.\n\n브라우저의 클립보드 접근 권한을 확인해 주세요. (또는 Ctrl + V 단축키로 직접 붙여넣으실 수도 있습니다.)');
        }
      });
    }
  }

  function handlePosterFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('⚠️ 이미지 파일만 업로드할 수 있습니다!');
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      state.posterImage = e.target.result;
      
      const previewImg = document.getElementById('img-poster-preview');
      if (previewImg) previewImg.src = state.posterImage;
      
      document.getElementById('upload-prompt-view').style.display = 'none';
      document.getElementById('upload-preview-view').style.display = 'flex';
      
      const btnGoTo64From3b = document.getElementById('btn-go-to-64-from-3b');
      if (btnGoTo64From3b) btnGoTo64From3b.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  // Re-upload Button
  const btnReUpload = document.getElementById('btn-re-upload');
  if (btnReUpload) {
    btnReUpload.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent triggering dragDropZone click trigger
      
      state.posterImage = null;
      if (filePosterInput) filePosterInput.value = '';
      
      document.getElementById('upload-prompt-view').style.display = 'flex';
      document.getElementById('upload-preview-view').style.display = 'none';
      document.getElementById('img-poster-preview').src = '#';
      
      const btnGoTo64From3b = document.getElementById('btn-go-to-64-from-3b');
      if (btnGoTo64From3b) btnGoTo64From3b.disabled = true;
    });
  }

  // Go to 6-4 from 3b
  const btnGoTo64From3b = document.getElementById('btn-go-to-64-from-3b');
  if (btnGoTo64From3b) {
    btnGoTo64From3b.addEventListener('click', () => {
      goToSubStep64();
    });
  }

  // Skip Poster Step Button
  const btnSkipPoster = document.getElementById('btn-skip-poster');
  if (btnSkipPoster) {
    btnSkipPoster.addEventListener('click', () => {
      state.posterImage = null; // Clear poster image since they skipped
      goToSubStep64();
    });
  }

  function goToSubStep64() {
    const card63b = document.getElementById('sub-step-6-3b');
    const card64 = document.getElementById('sub-step-6-4');
    if (card63b) card63b.style.display = 'none';
    if (card64) {
      card64.style.display = 'block';
      
      // Reset takeaways
      document.querySelectorAll('.takeaway-item-6').forEach(item => item.classList.remove('checked'));
      document.querySelector('.takeaway-item-6 .takeaway-check-6').textContent = '';
      const btnTakeaway = document.getElementById('btn-complete-takeaway-64');
      if (btnTakeaway) btnTakeaway.disabled = true;

      // Hide certificate preview initially
      document.getElementById('certificate-showcase-area').style.display = 'none';

      card64.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // Back Button from 6-3b to 6-3
  const btnBackTo63 = document.getElementById('btn-back-to-63');
  if (btnBackTo63) {
    btnBackTo63.addEventListener('click', () => {
      const card63b = document.getElementById('sub-step-6-3b');
      const card63 = document.getElementById('sub-step-6-3');
      if (card63b) card63b.style.display = 'none';
      if (card63) {
        card63.style.display = 'block';
        card63.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Standard Back Buttons
  const btnBackTo61 = document.getElementById('btn-back-to-61');
  if (btnBackTo61) {
    btnBackTo61.addEventListener('click', () => {
      const card62 = document.getElementById('sub-step-6-2');
      const card61 = document.getElementById('sub-step-6-1');
      if (card62) card62.style.display = 'none';
      if (card61) {
        card61.style.display = 'block';
        card61.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  const btnBackTo62 = document.getElementById('btn-back-to-62');
  if (btnBackTo62) {
    btnBackTo62.addEventListener('click', () => {
      const card63 = document.getElementById('sub-step-6-3');
      const card62 = document.getElementById('sub-step-6-2');
      if (card63) card63.style.display = 'none';
      if (card62) {
        card62.style.display = 'block';
        card62.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // ==========================================
  // K. 6단계: 수료증 및 배움 정리 (지도 연동 & 클립보드 & QR)
  // ==========================================
  
  // 6-4. 배움 정리 체크 연동
  const takeawaysList6 = [1, 2, 3];
  takeawaysList6.forEach(num => {
    const item = document.querySelector(`.takeaway-item-6[data-num="${num}"]`);
    if (item) {
      item.addEventListener('click', () => {
        const check = item.querySelector('.takeaway-check-6');
        if (item.classList.contains('checked')) {
          item.classList.remove('checked');
          if (check) check.textContent = '';
        } else {
          item.classList.add('checked');
          if (check) check.textContent = '✔️';
        }
        checkTakeawayCompletion6();
      });
    }
  });

  function checkTakeawayCompletion6() {
    const allChecked = Array.from(document.querySelectorAll('.takeaway-item-6')).every(item => item.classList.contains('checked'));
    const btn = document.getElementById('btn-complete-takeaway-64');
    if (btn) {
      btn.disabled = !allChecked;
    }
  }

  const btnCompleteTakeaway64 = document.getElementById('btn-complete-takeaway-64');
  if (btnCompleteTakeaway64) {
    btnCompleteTakeaway64.addEventListener('click', () => {
      document.getElementById('certificate-showcase-area').style.display = 'block';
      renderCertificate6();
      document.getElementById('certificate-showcase-area').scrollIntoView({ behavior: 'smooth' });
      playConfetti();
    });
  }

  function renderCertificate6() {
    const studentName = state.studentName || '참가자';
    const nameLabel = document.getElementById('cert-name-label');
    if (nameLabel) nameLabel.textContent = studentName;

    const zone = state.selectedZone || 'south';
    
    // Set watermark background
    const watermark = document.getElementById('cert-watermark-overlay');
    if (watermark) {
      watermark.style.backgroundImage = `url('images/${zone}_zone.png')`;
    }

    // Set badge emoji and text
    const badgeEmoji = document.getElementById('cert-badge-emoji');
    const mainText = document.getElementById('cert-main-body-text');
    
    if (state.usedHelper) {
      if (badgeEmoji) badgeEmoji.textContent = '🏅';
      if (mainText) {
        mainText.innerHTML = `위 학생은 초등학교 4학년 수학 [막대그래프]와 사회 [우리 지역의 특성] 단원의 교과 융합 프로젝트 수업에 참여하여, 포천 구역별 지도의 기호를 탐구하고 막대그래프 완성 및 우리 지역의 지역적 특성 분석 소개글 작성 미션을 <strong>[성실히 해결]</strong>하였기에 이 격려장을 수여합니다.`;
      }
    } else {
      if (badgeEmoji) badgeEmoji.textContent = '🏆';
      if (mainText) {
        mainText.innerHTML = `위 학생은 초등학교 4학년 수학 [막대그래프]와 사회 [우리 지역의 특성] 단원의 교과 융합 프로젝트 수업에 참여하여, 도움 없이 스스로 지도의 기호를 탐구하고 막대그래프 완성 및 우리 지역의 지역적 특성 분석 소개글 작성 미션을 <strong>[스스로 해결]</strong>하였기에 이 우수 수료증을 수여합니다.`;
      }
    }


    // Load Intro sentence
    const introLabel = document.getElementById('cert-introduction-text');
    if (introLabel) {
      introLabel.textContent = `"${getCertificateIntroText(zone)}"`;
    }

    // Render Mini Graph
    renderCertMiniGraph6();

    // Show/hide AI Poster showcase next to certificate
    const showcaseWrapper = document.getElementById('poster-showcase-wrapper');
    const finalPosterImg = document.getElementById('img-poster-final-showcase');
    const finalPosterText = document.getElementById('final-poster-text-label');
    const btnCopyPoster = document.getElementById('btn-copy-poster-clipboard');
    
    if (state.posterImage) {
      if (showcaseWrapper) showcaseWrapper.style.display = 'block';
      if (finalPosterImg) finalPosterImg.src = state.posterImage;
      if (finalPosterText) {
        finalPosterText.textContent = `"${getCertificateIntroText(zone)}"`;
      }
      if (btnCopyPoster) btnCopyPoster.style.display = 'inline-flex';
    } else {
      if (showcaseWrapper) showcaseWrapper.style.display = 'none';
      if (btnCopyPoster) btnCopyPoster.style.display = 'none';
    }
  }

  function getCertificateIntroText(zone) {
    const isDropdownMode = document.getElementById('writing-mode-dropdown') && document.getElementById('writing-mode-dropdown').style.display === 'block';
    if (isDropdownMode) {
      const s1Val = document.getElementById('sel-63-1')?.value || '';
      const s2Val = document.getElementById('sel-63-2')?.value || '';
      const s3Val = document.getElementById('sel-63-3')?.value || '';
      const s4Val = document.getElementById('sel-63-4')?.value || '';
      const s5Val = document.getElementById('sel-63-5')?.value || '';

      const symbolNames = {
        school: "학교",
        factory: "공장",
        field: "논",
        mountain: "산",
        museum: "명승고적",
        quarry: "채석장"
      };
      const descNames = {
        urban: "공장에서 물건을 만들거나 학교에 다니며 편리하게 생활",
        tourism: "숲을 가꾸고 논밭에서 농사를 지으며 평화롭게 생활",
        industrial: "자연 유산을 가꾸고 채석장에서 돌을 캐며 생활"
      };

      const s1Name = symbolNames[s1Val] || '( )';
      const s2Name = s2Val || '( )';
      const s3Name = symbolNames[s3Val] || '( )';
      const s4Name = s4Val || '( )';
      const s5Name = descNames[s5Val] || '( )';

      const zoneName = zone === 'south' ? '남부' : zone === 'north' ? '북부' : '중부';
      return `${zoneName} 구역에서 가장 많은 것은 ${s2Name}개의 ${s1Name}이고, 두 번째로 많은 것은 ${s4Name}개의 ${s3Name}입니다. 이곳에는 ${s5Name}하는 사람이 많은 지역입니다.`;
    } else {
      const textarea = document.getElementById('textarea-description-63');
      return textarea ? textarea.value.trim() : '';
    }
  }

  function renderCertMiniGraph6() {
    const container = document.getElementById('cert-mini-chart-wrapper-6');
    if (!container) return;
    container.innerHTML = '';

    const zone = state.selectedZone || 'south';
    const counts = ZONE_DATA[zone].counts;
    const items = [
      { name: '학교', val: counts.school },
      { name: '공장', val: counts.factory },
      { name: '논', val: counts.field },
      { name: '산', val: counts.mountain },
      { name: '명승고적', val: counts.museum },
      { name: '채석장', val: counts.quarry }
    ];

    const maxVal = Math.max(...items.map(x => x.val), 8);
    const divisions = maxVal;

    if (ebsDirection6 === 'vertical') {
      container.classList.remove('ebs-mode-horizontal');

      // 1. Axes
      const axisY = document.createElement('div');
      axisY.className = 'ebs-axis-y';
      container.appendChild(axisY);

      const axisX = document.createElement('div');
      axisX.className = 'ebs-axis-x';
      container.appendChild(axisX);

      // 2. Grid lines
      for (let i = 0; i <= divisions; i++) {
        const pct = (i / divisions) * 100;
        const line = document.createElement('div');
        line.className = 'ebs-grid-line';
        if (i % 5 === 0) line.classList.add('major');
        line.style.bottom = `${pct}%`;
        container.appendChild(line);
      }

      // 3. Y-axis labels
      const yLabelBox = document.createElement('div');
      yLabelBox.className = 'ebs-y-label-box';
      for (let i = divisions; i >= 0; i--) {
        const labelDiv = document.createElement('div');
        labelDiv.textContent = i;
        yLabelBox.appendChild(labelDiv);
      }
      container.appendChild(yLabelBox);

      // 4. X-axis labels
      const xLabelBox = document.createElement('div');
      xLabelBox.className = 'ebs-x-label-box';
      items.forEach(item => {
        const labelDiv = document.createElement('div');
        labelDiv.textContent = item.name;
        labelDiv.style.flex = '1';
        labelDiv.style.textAlign = 'center';
        labelDiv.style.fontSize = '0.7rem';
        xLabelBox.appendChild(labelDiv);
      });
      container.appendChild(xLabelBox);

      // Y-axis unit label
      const yUnit = document.createElement('div');
      yUnit.textContent = '개수(개)';
      yUnit.style.cssText = 'position: absolute; left: -35px; top: -18px; font-size: 0.65rem; font-weight: 800; color: #475569;';
      container.appendChild(yUnit);

      // 5. Bars
      const barsWrapper = document.createElement('div');
      barsWrapper.className = 'ebs-bars-wrapper';
      
      items.forEach(item => {
        const barCol = document.createElement('div');
        barCol.className = 'ebs-bar-col';
        barCol.style.flex = '1';
        
        const pct = (item.val / maxVal) * 100;
        
        const bar = document.createElement('div');
        bar.className = 'ebs-bar';
        bar.style.height = `${pct}%`;
        bar.style.width = '18px';
        bar.style.backgroundColor = '#3b82f6';
        
        const barVal = document.createElement('div');
        barVal.className = 'ebs-bar-value';
        barVal.textContent = item.val;
        barVal.style.cssText = 'position: absolute; top: -18px; width: 100%; text-align: center; font-size: 0.7rem; font-weight: 800; color: #1e293b;';
        
        bar.appendChild(barVal);
        barCol.appendChild(bar);
        barsWrapper.appendChild(barCol);
      });
      container.appendChild(barsWrapper);
    } else {
      container.classList.add('ebs-mode-horizontal');

      // 1. Axes
      const axisY = document.createElement('div');
      axisY.className = 'ebs-axis-y';
      container.appendChild(axisY);

      const axisX = document.createElement('div');
      axisX.className = 'ebs-axis-x';
      container.appendChild(axisX);

      // 2. Grid lines (vertical)
      for (let i = 0; i <= divisions; i++) {
        const pct = (i / divisions) * 100;
        const line = document.createElement('div');
        line.className = 'ebs-grid-line-vertical';
        if (i % 5 === 0) line.classList.add('major');
        line.style.left = `${pct}%`;
        container.appendChild(line);
      }

      // 3. X-axis labels (numbers)
      const xLabelBoxHorizontal = document.createElement('div');
      xLabelBoxHorizontal.className = 'ebs-x-label-box-horizontal';
      for (let i = 0; i <= divisions; i++) {
        const labelDiv = document.createElement('div');
        labelDiv.textContent = i;
        labelDiv.style.flex = '1';
        labelDiv.style.textAlign = 'right';
        xLabelBoxHorizontal.appendChild(labelDiv);
      }
      container.appendChild(xLabelBoxHorizontal);

      // 4. Y-axis labels (categories)
      const yLabelBoxHorizontal = document.createElement('div');
      yLabelBoxHorizontal.className = 'ebs-y-label-box-horizontal';
      items.forEach(item => {
        const labelDiv = document.createElement('div');
        labelDiv.textContent = item.name;
        yLabelBoxHorizontal.appendChild(labelDiv);
      });
      container.appendChild(yLabelBoxHorizontal);

      // X-axis unit label
      const xUnit = document.createElement('div');
      xUnit.textContent = '개수(개)';
      xUnit.style.cssText = 'position: absolute; right: -30px; bottom: -18px; font-size: 0.65rem; font-weight: 800; color: #475569;';
      container.appendChild(xUnit);

      // 5. Bars (horizontal)
      const barsWrapperHorizontal = document.createElement('div');
      barsWrapperHorizontal.className = 'ebs-bars-wrapper-horizontal';
      
      items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'ebs-bar-row-horizontal';
        row.style.flex = '1';
        
        const pct = (item.val / maxVal) * 100;
        row.innerHTML = `
          <div class="ebs-bar-horizontal" style="width: ${pct}%; height: 14px; background-color: #3b82f6; position: relative;">
            <div class="ebs-bar-val-label-horizontal" style="color: #1e293b; font-weight:800; font-size: 0.7rem; position: absolute; right: -25px; top: -2px;">${item.val}</div>
          </div>
        `;
        barsWrapperHorizontal.appendChild(row);
      });
      container.appendChild(barsWrapperHorizontal);
    }
  }

  function renderWritingMiniGraph6() {
    const container = document.getElementById('writing-mini-chart-wrapper-6');
    if (!container) return;
    container.innerHTML = '';

    const zone = state.selectedZone || 'south';
    const counts = ZONE_DATA[zone].counts;
    const items = [
      { key: 'school', name: '학교', val: counts.school },
      { key: 'factory', name: '공장', val: counts.factory },
      { key: 'field', name: '논', val: counts.field },
      { key: 'mountain', name: '산', val: counts.mountain },
      { key: 'museum', name: '명승고적', val: counts.museum },
      { key: 'quarry', name: '채석장', val: counts.quarry }
    ];

    const maxVal = Math.max(...items.map(x => x.val), 8);
    const divisions = maxVal;

    if (ebsDirection6 === 'vertical') {
      container.classList.remove('ebs-mode-horizontal');

      // 1. Axes
      const axisY = document.createElement('div');
      axisY.className = 'ebs-axis-y';
      container.appendChild(axisY);

      const axisX = document.createElement('div');
      axisX.className = 'ebs-axis-x';
      container.appendChild(axisX);

      // 2. Grid lines
      for (let i = 0; i <= divisions; i++) {
        const pct = (i / divisions) * 100;
        const line = document.createElement('div');
        line.className = 'ebs-grid-line';
        if (i % 5 === 0) line.classList.add('major');
        line.style.bottom = `${pct}%`;
        container.appendChild(line);
      }

      // 3. Y-axis labels
      const yLabelBox = document.createElement('div');
      yLabelBox.className = 'ebs-y-label-box';
      for (let i = divisions; i >= 0; i--) {
        const labelDiv = document.createElement('div');
        labelDiv.textContent = i;
        yLabelBox.appendChild(labelDiv);
      }
      container.appendChild(yLabelBox);

      // 4. X-axis labels
      const xLabelBox = document.createElement('div');
      xLabelBox.className = 'ebs-x-label-box';
      items.forEach(item => {
        const labelDiv = document.createElement('div');
        labelDiv.textContent = item.name;
        labelDiv.style.flex = '1';
        labelDiv.style.textAlign = 'center';
        labelDiv.style.fontSize = '0.7rem';
        xLabelBox.appendChild(labelDiv);
      });
      container.appendChild(xLabelBox);

      // Y-axis unit label
      const yUnit = document.createElement('div');
      yUnit.textContent = '개수(개)';
      yUnit.style.cssText = 'position: absolute; left: -35px; top: -18px; font-size: 0.65rem; font-weight: 800; color: #475569;';
      container.appendChild(yUnit);

      // 5. Bars
      const barsWrapper = document.createElement('div');
      barsWrapper.className = 'ebs-bars-wrapper';
      
      items.forEach(item => {
        const barCol = document.createElement('div');
        barCol.className = 'ebs-bar-col';
        barCol.style.flex = '1';
        
        const pct = (item.val / maxVal) * 100;
        
        const bar = document.createElement('div');
        bar.className = 'ebs-bar';
        bar.style.height = `${pct}%`;
        bar.style.width = '16px';
        bar.style.backgroundColor = '#3b82f6';
        
        const barVal = document.createElement('div');
        barVal.className = 'ebs-bar-value';
        barVal.textContent = item.val;
        barVal.style.cssText = 'position: absolute; top: -18px; width: 100%; text-align: center; font-size: 0.7rem; font-weight: 800; color: #1e293b;';
        
        bar.appendChild(barVal);
        barCol.appendChild(bar);
        barsWrapper.appendChild(barCol);
      });
      container.appendChild(barsWrapper);
    } else {
      container.classList.add('ebs-mode-horizontal');

      // 1. Axes
      const axisY = document.createElement('div');
      axisY.className = 'ebs-axis-y';
      container.appendChild(axisY);

      const axisX = document.createElement('div');
      axisX.className = 'ebs-axis-x';
      container.appendChild(axisX);

      // 2. Grid lines (vertical)
      for (let i = 0; i <= divisions; i++) {
        const pct = (i / divisions) * 100;
        const line = document.createElement('div');
        line.className = 'ebs-grid-line-vertical';
        if (i % 5 === 0) line.classList.add('major');
        line.style.left = `${pct}%`;
        container.appendChild(line);
      }

      // 3. X-axis labels (numbers)
      const xLabelBoxHorizontal = document.createElement('div');
      xLabelBoxHorizontal.className = 'ebs-x-label-box-horizontal';
      for (let i = 0; i <= divisions; i++) {
        const labelDiv = document.createElement('div');
        labelDiv.textContent = i;
        labelDiv.style.flex = '1';
        labelDiv.style.textAlign = 'right';
        xLabelBoxHorizontal.appendChild(labelDiv);
      }
      container.appendChild(xLabelBoxHorizontal);

      // 4. Y-axis labels (categories)
      const yLabelBoxHorizontal = document.createElement('div');
      yLabelBoxHorizontal.className = 'ebs-y-label-box-horizontal';
      items.forEach(item => {
        const labelDiv = document.createElement('div');
        labelDiv.textContent = item.name;
        yLabelBoxHorizontal.appendChild(labelDiv);
      });
      container.appendChild(yLabelBoxHorizontal);

      // X-axis unit label
      const xUnit = document.createElement('div');
      xUnit.textContent = '개수(개)';
      xUnit.style.cssText = 'position: absolute; right: -30px; bottom: -18px; font-size: 0.65rem; font-weight: 800; color: #475569;';
      container.appendChild(xUnit);

      // 5. Bars (horizontal)
      const barsWrapperHorizontal = document.createElement('div');
      barsWrapperHorizontal.className = 'ebs-bars-wrapper-horizontal';
      
      items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'ebs-bar-row-horizontal';
        row.style.flex = '1';
        
        const pct = (item.val / maxVal) * 100;
        row.innerHTML = `
          <div class="ebs-bar-horizontal" style="width: ${pct}%; height: 14px; background-color: #3b82f6; position: relative;">
            <div class="ebs-bar-val-label-horizontal" style="color: #1e293b; font-weight:800; font-size: 0.7rem; position: absolute; right: -25px; top: -2px;">${item.val}</div>
          </div>
        `;
        barsWrapperHorizontal.appendChild(row);
      });
      container.appendChild(barsWrapperHorizontal);
    }
  }

  // Canvas copy to clipboard
  const btnCopyCertClipboard = document.getElementById('btn-copy-cert-clipboard');
  if (btnCopyCertClipboard) {
    btnCopyCertClipboard.addEventListener('click', () => {
      copyCertificateToClipboard6();
    });
  }

  const btnCopyPosterClipboard = document.getElementById('btn-copy-poster-clipboard');
  if (btnCopyPosterClipboard) {
    btnCopyPosterClipboard.addEventListener('click', () => {
      copyPosterToClipboard6();
    });
  }

  async function copyCertificateToClipboard6() {
    const canvas = document.createElement('canvas');
    canvas.width = 650;
    canvas.height = 550;
    const ctx = canvas.getContext('2d');
    
    // Background color
    ctx.fillStyle = '#fffdf5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Outer Borders
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
    
    // Badge
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const badgeText = state.usedHelper ? '🏅' : '🏆';
    ctx.fillText(badgeText, canvas.width / 2, 65);
    
    // Title
    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('막대그래프 탐험 수료증', canvas.width / 2, 110);
    
    // Recipient
    const studentName = state.studentName || '참가자';
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(studentName + ' 탐험가 (모둠 조사관)', canvas.width / 2, 150);
    
    // Badge Label
    const badgeLabel = state.usedHelper ? '[성실히 해결]' : '[스스로 해결]';
    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(badgeLabel, canvas.width / 2, 180);
    
    // Body text
    ctx.fillStyle = '#4b5563';
    ctx.font = '13px sans-serif';
    const bodyText = state.usedHelper
      ? "위 학생은 초등학교 4학년 수학 [막대그래프]와 사회 [우리 지역의 특성] 단원의 교과 융합 프로젝트 수업에 참여하여, 포천 구역별 지도의 기호를 탐구하고 막대그래프 완성 및 우리 지역의 지역적 특성 분석 소개글 작성 미션을 [성실히 해결]하였기에 이 격려장을 수여합니다."
      : "위 학생은 초등학교 4학년 수학 [막대그래프]와 사회 [우리 지역의 특성] 단원의 교과 융합 프로젝트 수업에 참여하여, 도움 없이 스스로 지도의 기호를 탐구하고 막대그래프 완성 및 우리 지역의 지역적 특성 분석 소개글 작성 미션을 [스스로 해결]하였기에 이 우수 수료증을 수여합니다.";
    
    wrapText(ctx, bodyText, canvas.width / 2, 205, canvas.width - 120, 22);
    
    // Draw Mini Graph Container Box
    const boxX = 75;
    const boxY = 275;
    const boxW = 500;
    const boxH = 180;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    
    // Title inside the box
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('📊 내가 탐구한 구역 막대그래프', boxX + 15, boxY + 12);
    
    // Graph area coordinates inside the box
    const graphX = boxX + 50;
    const graphY = boxY + 38;
    const graphW = boxW - 75;
    const graphH = 110;
    
    const zone = state.selectedZone || 'south';
    const counts = ZONE_DATA[zone].counts;
    const items = [
      { name: '학교', val: counts.school },
      { name: '공장', val: counts.factory },
      { name: '논', val: counts.field },
      { name: '산', val: counts.mountain },
      { name: '명승고적', val: counts.museum },
      { name: '채석장', val: counts.quarry }
    ];
    
    const maxVal = Math.max(...items.map(x => x.val), 8);
    const divisions = maxVal;
    
    if (ebsDirection6 === 'vertical') {
      // 1. Grid lines (horizontal dashed lines)
      ctx.lineWidth = 1;
      for (let i = 0; i <= divisions; i++) {
        const y = graphY + graphH - (i / divisions) * graphH;
        if (i % 5 === 0) {
          ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = 'rgba(71, 85, 105, 0.25)';
          ctx.setLineDash([2, 2]);
        }
        ctx.beginPath();
        ctx.moveTo(graphX, y);
        ctx.lineTo(graphX + graphW, y);
        ctx.stroke();
      }
      ctx.setLineDash([]); // Reset line dash
      
      // 2. Axes
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Y-axis
      ctx.moveTo(graphX, graphY);
      ctx.lineTo(graphX, graphY + graphH);
      // X-axis
      ctx.moveTo(graphX, graphY + graphH);
      ctx.lineTo(graphX + graphW, graphY + graphH);
      ctx.stroke();
      
      // 3. Y-axis labels (numbers)
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let i = 0; i <= divisions; i++) {
        const y = graphY + graphH - (i / divisions) * graphH;
        ctx.fillText(i.toString(), graphX - 8, y);
      }
      
      // Y-axis unit label
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('개수(개)', graphX - 4, graphY - 8);
      
      // 4. Bars & labels
      const colW = graphW / items.length;
      const barW = 24;
      
      items.forEach((item, idx) => {
        const colX = graphX + idx * colW;
        const barX = colX + (colW - barW) / 2;
        
        const pct = item.val / maxVal;
        const barH = pct * graphH;
        const y = graphY + graphH - barH;
        
        // Bar
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(barX, y, barW, barH);
        
        // Value
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(item.val.toString(), barX + barW / 2, y - 4);
        
        // Category Label below X-axis
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(item.name, barX + barW / 2, graphY + graphH + 8);
      });
    } else {
      // 1. Grid lines (vertical dashed lines)
      ctx.lineWidth = 1;
      for (let i = 0; i <= divisions; i++) {
        const x = graphX + (i / divisions) * graphW;
        if (i % 5 === 0) {
          ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = 'rgba(71, 85, 105, 0.25)';
          ctx.setLineDash([2, 2]);
        }
        ctx.beginPath();
        ctx.moveTo(x, graphY);
        ctx.lineTo(x, graphY + graphH);
        ctx.stroke();
      }
      ctx.setLineDash([]); // Reset line dash
      
      // 2. Axes
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Y-axis
      ctx.moveTo(graphX, graphY);
      ctx.lineTo(graphX, graphY + graphH);
      // X-axis
      ctx.moveTo(graphX, graphY + graphH);
      ctx.lineTo(graphX + graphW, graphY + graphH);
      ctx.stroke();
      
      // 3. X-axis labels (numbers)
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let i = 0; i <= divisions; i++) {
        const x = graphX + (i / divisions) * graphW;
        ctx.fillText(i.toString(), x, graphY + graphH + 8);
      }
      
      // X-axis unit label (placed to the right of X axis end)
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('개수(개)', graphX + graphW + 6, graphY + graphH + 6);
      
      // 4. Bars & labels (horizontal rows)
      const rowH = graphH / items.length;
      const barH = 12;
      
      items.forEach((item, idx) => {
        const rowY = graphY + idx * rowH;
        const barY = rowY + (rowH - barH) / 2;
        
        const pct = item.val / maxVal;
        const barW = pct * graphW;
        
        // Bar
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(graphX, barY, barW, barH);
        
        // Value (placed to the right of the bar)
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.val.toString(), graphX + barW + 5, barY + barH / 2);
        
        // Category Label to the left of Y-axis
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.name, graphX - 8, barY + barH / 2);
      });
    }
    
    // Intro text at bottom (with wrapText to prevent overflow)
    ctx.fillStyle = '#1e3f20';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const introText = getCertificateIntroText(zone);
    wrapText(ctx, introText, canvas.width / 2, 468, canvas.width - 120, 18);
    
    // Date
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('2026년 6월 17일', canvas.width / 2, 510);
    
    // Write blob to clipboard
    canvas.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        alert("수료증 이미지가 클립보드에 복사되었습니다! 패들릿 새 탭에서 붙여넣기(Ctrl+V) 하세요. 📋");
      } catch (err) {
        console.error(err);
        alert("클립보드 복사에 실패했습니다. 마우스 우클릭으로 이미지를 복사/저장하거나 화면을 캡처해 주세요.");
      }
    }, 'image/png');
  }

  async function copyPosterToClipboard6() {
    if (!state.posterImage) {
      alert('복사할 포스터 이미지가 없습니다.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 650;
    canvas.height = 550;
    const ctx = canvas.getContext('2d');
    
    // Background color (lavender)
    ctx.fillStyle = '#faf5ff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Outer Borders (purple)
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
    
    // Badge/Emoji
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎨', canvas.width / 2, 60);
    
    // Title
    ctx.fillStyle = '#581c87';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('내가 완성한 AI 홍보 포스터', canvas.width / 2, 105);
    
    // Subtitle
    const zone = state.selectedZone || 'south';
    const zoneNames = { south: '남부', north: '북부', middle: '중부' };
    const zoneName = zoneNames[zone] || '우리';
    ctx.fillStyle = '#7c3aed';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`포천 ${zoneName} 구역 홍보`, canvas.width / 2, 138);

    // Draw the AI Poster Image
    const img = new Image();
    img.src = state.posterImage;
    img.onload = () => {
      try {
        const targetW = 340;
        const targetH = 240;
        const targetX = (canvas.width - targetW) / 2;
        const targetY = 165;
        
        // Draw white background card for the image
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(targetX - 10, targetY - 10, targetW + 20, targetH + 20);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(targetX - 10, targetY - 10, targetW + 20, targetH + 20);
        
        // Calculate aspect ratio of uploaded image to fit inside targetW x targetH
        let drawW = img.width;
        let drawH = img.height;
        const ratio = Math.min(targetW / drawW, targetH / drawH);
        drawW = drawW * ratio;
        drawH = drawH * ratio;
        
        const drawX = targetX + (targetW - drawW) / 2;
        const drawY = targetY + (targetH - drawH) / 2;
        
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        
        // Draw the description box background
        const descX = 75;
        const descY = 425;
        const descW = 500;
        const descH = 65;
        
        ctx.fillStyle = '#fdf4ff';
        ctx.fillRect(descX, descY, descW, descH);
        ctx.strokeStyle = '#f3e8ff';
        ctx.lineWidth = 1;
        ctx.strokeRect(descX, descY, descW, descH);
        
        // Draw the text inside description box
        ctx.fillStyle = '#581c87';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const introText = getCertificateIntroText(zone);
        wrapText(ctx, `"${introText}"`, canvas.width / 2, descY + 32, descW - 30, 18);
        
        // Draw Date
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('2026년 6월 17일', canvas.width / 2, 512);
        
        // Copy to clipboard
        canvas.toBlob(async (blob) => {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            alert("AI 홍보 포스터 이미지가 클립보드에 복사되었습니다! 패들릿 새 탭에서 붙여넣기(Ctrl+V) 하세요. 🎨");
          } catch (err) {
            console.error(err);
            alert("클립보드 복사에 실패했습니다. 마우스 우클릭으로 이미지를 복사/저장하거나 화면을 캡처해 주세요.");
          }
        }, 'image/png');
      } catch (err) {
        console.error(err);
        alert("이미지 처리 도중 오류가 발생했습니다.");
      }
    };
    img.onerror = () => {
      alert("포스터 이미지를 불러올 수 없습니다.");
    };
  }

  function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const chars = text.split('');
    let line = '';
    let testLine = '';
    let lines = [];
    
    for (let n = 0; n < chars.length; n++) {
      testLine = line + chars[n];
      const metrics = context.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        lines.push(line);
        line = chars[n];
      } else {
        line = testLine;
      }
    }
    lines.push(line);
    
    for (let i = 0; i < lines.length; i++) {
      context.fillText(lines[i], x, y + (i * lineHeight));
    }
  }

  const btnPrintCert6 = document.getElementById('btn-print-cert-6');
  if (btnPrintCert6) {
    btnPrintCert6.addEventListener('click', () => {
      window.print();
    });
  }

  // ==========================================
  // L. 처음으로 돌아가기 (초기화) 및 폭죽 애니메이션 엔진
  // ==========================================
  const btnRestartAdventure = document.getElementById('btn-restart-adventure');
  if (btnRestartAdventure) {
    btnRestartAdventure.addEventListener('click', () => {
      if (confirm('학습 기록을 삭제하고 처음부터 다시 시작할까요?')) {
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
        
        const helperBox = document.getElementById('scale-31-helper-box');
        if (helperBox) helperBox.style.display = 'none';
        state.drawing33Data = { chopsticks: 0, cup: 0, bag: 0, spoon: 0 };
        state.customGraph = {
          title: '우리 반 친구들이 좋아하는 명소',
          unit: '표',
          items: [
            { name: '선호도 조사 중...', val: 12 },
            { name: '산정호수', val: 10 },
            { name: '아트밸리', val: 8 },
            { name: '평강랜드', val: 6 }
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

        state.selectedZone = 'south';
        selectZone('south');
        initDetailedMap6('south');
        state.usedHelper = false;

        takeawaysList.forEach(num => {
          const item = document.getElementById(`takeaway-item-${num}`);
          if (item) item.classList.remove('checked');
        });
        const btnTakeaway = document.getElementById('btn-complete-takeaway');
        if (btnTakeaway) btnTakeaway.disabled = true;

        // Reset Step 6 takeaways
        document.querySelectorAll('.takeaway-item-6').forEach(item => item.classList.remove('checked'));
        document.querySelectorAll('.takeaway-check-6').forEach(check => check.textContent = '');
        const btnTakeaway6 = document.getElementById('btn-complete-takeaway-64');
        if (btnTakeaway6) btnTakeaway6.disabled = true;

        document.querySelectorAll('.quiz-feedback').forEach(fb => {
          fb.style.display = 'none';
          fb.textContent = '';
        });

        const countingWorkspace = document.getElementById('counting-workspace-41');
        if (countingWorkspace) countingWorkspace.style.display = 'none';
        
        const box = document.getElementById('local-board-box');
        if (box) {
          box.style.display = 'none';
          if (btnToggleLocalBoard) {
            btnToggleLocalBoard.textContent = '🖥️ 화면이 안 보여요! 가상 투표판 열기';
          }
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
          ebsTitleInput.value = "우리 반 친구들이 좋아하는 명소";
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
        const btnNextTo5 = document.getElementById('btn-next-to-5');
  if (btnNextTo5) {
    btnNextTo5.addEventListener('click', () => {
      showPanel(5);
      updateNavigationUI();
    });
  }

  const btnNextTo6 = document.getElementById('btn-next-to-6');
  if (btnNextTo6) {
    btnNextTo6.addEventListener('click', () => {
      showPanel(6);
      updateNavigationUI();
    });
  }

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

  // 폭죽 파티클 애니메이션 엔진
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

  function initStep5() {
    const tabBtns = document.querySelectorAll('.step5-tab-btn');
    const panels = document.querySelectorAll('.step5-act-panel');
    
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const actNum = btn.getAttribute('data-act');
        if (btn.classList.contains('locked')) return;
        
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        panels.forEach(p => p.classList.remove('active'));
        const targetPanel = document.getElementById(`step5-act${actNum}-panel`);
        if (targetPanel) targetPanel.classList.add('active');
      });
    });

    const btnCheck51 = document.getElementById('btn-check-act5-1');
    if (btnCheck51) {
      btnCheck51.addEventListener('click', () => {
        const q1 = document.querySelector('input[name="q51_1"]:checked');
        const q2 = document.querySelector('input[name="q51_2"]:checked');
        const q3 = document.querySelector('input[name="q51_3"]:checked');
        const q4 = document.querySelector('input[name="q51_4"]:checked');
        const fb = document.getElementById('act5-1-feedback');
        
        if (!q1 || !q2 || !q3 || !q4) {
          fb.textContent = '⚠️ 모든 질문에 답변을 선택해 주세요!';
          fb.className = 'quiz-feedback error';
          fb.style.display = 'block';
          return;
        }

        const isCorrect = (q1.value === '2020' && q2.value === '2020' && q3.value === 'b' && q4.value === 'decrease');
        if (isCorrect) {
          fb.innerHTML = '정답입니다! 🎉 친환경 자동차 등록 대수가 늘어남에 따라 배출량이 줄어들었음을 잘 찾아냈습니다. 다음 활동으로 넘어가세요.';
          fb.className = 'quiz-feedback success';
          fb.style.display = 'block';
          playConfetti();
          
          const nextTab = document.getElementById('btn-act5-2');
          if (nextTab) {
            nextTab.disabled = false;
            nextTab.classList.remove('locked');
          }
        } else {
          fb.innerHTML = '❌ 오답이 있습니다. 그래프 막대의 높이를 다시 한번 꼼꼼히 확인해 보세요!';
          fb.className = 'quiz-feedback error';
          fb.style.display = 'block';
        }
      });
    }

    const btnCheck52 = document.getElementById('btn-check-act5-2');
    if (btnCheck52) {
      btnCheck52.addEventListener('click', () => {
        const s1 = document.getElementById('act52-select-1').value;
        const s2 = document.getElementById('act52-select-2').value;
        const s3 = document.getElementById('act52-select-3').value;
        const s4 = document.getElementById('act52-select-4').value;
        const s5 = document.getElementById('act52-select-5').value;
        const fb = document.getElementById('act5-2-feedback');

        if (!s1 || !s2 || !s3 || !s4 || !s5) {
          fb.textContent = '⚠️ 빈칸의 드롭다운을 모두 골라 완성해 주세요!';
          fb.className = 'quiz-feedback error';
          fb.style.display = 'block';
          return;
        }

        const isCorrect = (s1 === 'parking' && s2 === 'garbage' && s3 === 'safety' && s4 === '40' && s5 === 'noise');
        if (isCorrect) {
          fb.innerHTML = '정답입니다! 🎉 그래프에서 각 항목의 값을 바르게 읽고 수치의 합도 완벽하게 계산해 냈습니다. 다음 활동으로 넘어가세요.';
          fb.className = 'quiz-feedback success';
          fb.style.display = 'block';
          playConfetti();
          
          const nextTab = document.getElementById('btn-act5-3');
          if (nextTab) {
            nextTab.disabled = false;
            nextTab.classList.remove('locked');
          }
        } else {
          fb.innerHTML = '❌ 오답이 있습니다. 그래프에서 각 항목의 크기를 다시 한번 자세히 살펴보세요!';
          fb.className = 'quiz-feedback error';
          fb.style.display = 'block';
        }
      });
    }

    const btnCheck53 = document.getElementById('btn-check-act5-3');
    if (btnCheck53) {
      btnCheck53.addEventListener('click', () => {
        const q1 = document.querySelector('input[name="q53_1"]:checked');
        const q2 = document.querySelector('input[name="q53_2"]:checked');
        const fb = document.getElementById('act5-3-feedback');

        if (!q1 || !q2) {
          fb.textContent = '⚠️ 질문의 답변을 모두 선택해 주세요!';
          fb.className = 'quiz-feedback error';
          fb.style.display = 'block';
          return;
        }

        const isCorrect = (q1.value === '143680' && q2.value === 'b');
        if (isCorrect) {
          fb.innerHTML = '정답입니다! 🎉 뉴스 기사 속 독도 방문객 변화 추이와 코로나19 전염병의 영향도 바르게 추론해 냈습니다. 모든 미션을 마쳤으니 6단계로 가보세요!';
          fb.className = 'quiz-feedback success';
          fb.style.display = 'block';
          playConfetti();
          
          const btnNextTo6 = document.getElementById('btn-next-to-6');
          if (btnNextTo6) btnNextTo6.disabled = false;
          unlockNext(5);
        } else {
          fb.innerHTML = '❌ 오답이 있습니다. 뉴스 기사 텍스트와 그래프 막대의 값을 다시 한번 꼼꼼히 대조해 보세요!';
          fb.className = 'quiz-feedback error';
          fb.style.display = 'block';
        }
      });
    }
  }

  // ==========================================
  // M. 초기 로딩 구동
  // ==========================================
  loadProgress();
  initStep5();
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
