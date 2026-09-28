/* =====================================================
   MIZKARATI — SCRIPT.JS
   Made by Rami Talah
===================================================== */

var SUPABASE_URL = 'https://ncrycgbrstafdouvipzc.supabase.co';
var SUPABASE_KEY = 'sb_publishable_6t2dkU27Rkinsoo8MhYAEQ_FSgj4G73';
var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

var currentUser = null;
var currentPage = 'subjects';
var currentSubjectId = null;
var currentLessonId = null;
var quillEditor = null;
var isAdmin = false;
var musicPlaying = false;
var soundEnabled = true;

var state = {
  subjects: [], schedule: [], notifications: [], grades: [],
  challenges: [], tasks: [], exams: [], news: [], announcements: [],
  userStats: null,
  settings: {theme:'orange', mode:'dark', font:'Tajawal', soundEnabled:true, autoTheme:true, notifications:true},
  aiCache: JSON.parse(localStorage.getItem('ai_cache') || '{}')
};

var DAYS = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
var SPACED_INTERVALS = [1, 3, 7, 21];
var BEM_SUBJECTS = ['لغة عربية','رياضيات','فرنسية','إنجليزية','علوم طبيعية','فيزياء','تاريخ وجغرافيا','تربية إسلامية','تربية مدنية','تربية فنية','تربية بدنية','معلوماتية'];
var ICONS = ['fa-calculator','fa-atom','fa-flask','fa-book-open','fa-language','fa-spell-check','fa-landmark','fa-globe','fa-mosque','fa-scale-balanced','fa-dna','fa-earth-africa','fa-palette','fa-music','fa-laptop-code','fa-microscope','fa-chart-line','fa-code','fa-brain','fa-graduation-cap'];
var COLORS = [
  {name:'برتقالي', hex:'#FF7A00', dark:'#E65100'},
  {name:'بنفسجي', hex:'#8B5CF6', dark:'#6D28D9'},
  {name:'أزرق', hex:'#3B82F6', dark:'#1E40AF'},
  {name:'أخضر', hex:'#10B981', dark:'#047857'},
  {name:'وردي', hex:'#EC4899', dark:'#BE185D'},
  {name:'ذهبي', hex:'#F59E0B', dark:'#B45309'},
  {name:'أحمر', hex:'#EF4444', dark:'#B91C1C'},
  {name:'سماوي', hex:'#06B6D4', dark:'#0E7490'}
];

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function escapeHtml(s){ return (s||'').replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function stripHtml(html){ var tmp = document.createElement('div'); tmp.innerHTML = html; return tmp.textContent || tmp.innerText || ''; }
function fmtDate(ts){ try{ return new Date(ts).toLocaleDateString('ar-DZ'); }catch(e){ return ''; } }
function fmtDateTime(ts){ try{ var d = new Date(ts); return d.toLocaleDateString('ar-DZ') + ' · ' + d.toLocaleTimeString('ar-DZ',{hour:'2-digit',minute:'2-digit'}); }catch(e){ return ''; } }
function timeAgo(ts){
  var diff = Date.now() - ts;
  var m = Math.floor(diff/60000);
  if(m < 1) return 'الآن';
  if(m < 60) return 'قبل ' + m + ' دقيقة';
  var h = Math.floor(m/60);
  if(h < 24) return 'قبل ' + h + ' ساعة';
  var d = Math.floor(h/24);
  if(d < 30) return 'قبل ' + d + ' يوم';
  return fmtDate(ts);
}

function toast(msg, type){
  type = type || 'success';
  var container = document.getElementById('toastContainer');
  if(!container) return;
  var icons = {success:'fa-check-circle', error:'fa-triangle-exclamation', warning:'fa-exclamation-circle', info:'fa-info-circle'};
  var el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = '<div class="toast-icon"><i class="fa-solid ' + (icons[type] || icons.success) + '"></i></div>' +
    '<div class="toast-content"><div class="toast-msg">' + escapeHtml(msg) + '</div></div>';
  container.appendChild(el);
  setTimeout(function(){ el.classList.add('show'); }, 10);
  setTimeout(function(){ el.classList.remove('show'); setTimeout(function(){ el.remove(); }, 300); }, 3000);
}

function openModal(id){ var m = document.getElementById(id); if(m) m.classList.add('show'); }
function closeModal(id){ var m = document.getElementById(id); if(m){ m.classList.add('closing'); setTimeout(function(){ m.classList.remove('show'); m.classList.remove('closing'); }, 200); } }

document.addEventListener('click', function(e){
  if(e.target.classList && e.target.classList.contains('modal-overlay')){ e.target.classList.remove('show'); }
});

function switchLoginTab(tab){
  document.querySelectorAll('.login-tab').forEach(function(t){ t.classList.toggle('active', t.dataset.tab === tab); });
  document.querySelectorAll('.login-panel').forEach(function(p){ p.classList.remove('active'); });
  var panel = document.getElementById('loginPanel-' + tab);
  if(panel) panel.classList.add('active');
  hideLoginMsg();
}
function showLoginMsg(text, type){
  var msg = document.getElementById('loginMsg');
  if(!msg) return;
  var icons = {error:'fa-triangle-exclamation', success:'fa-check-circle', info:'fa-info-circle'};
  msg.className = 'login-msg show ' + (type || 'info');
  msg.innerHTML = '<i class="fa-solid ' + (icons[type] || icons.info) + '"></i><span>' + escapeHtml(text) + '</span>';
}
function hideLoginMsg(){ var msg = document.getElementById('loginMsg'); if(msg) msg.classList.remove('show'); }
function togglePass(inputId, btn){
  var input = document.getElementById(inputId);
  if(!input) return;
  if(input.type === 'password'){ input.type = 'text'; btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>'; }
  else { input.type = 'password'; btn.innerHTML = '<i class="fa-solid fa-eye"></i>'; }
}
function showSignUp(){
  document.getElementById('emailSignInForm').style.display = 'none';
  document.getElementById('emailSignUpForm').style.display = 'block';
  document.getElementById('forgotPasswordForm').style.display = 'none';
  hideLoginMsg();
}
function showSignIn(){
  document.getElementById('emailSignInForm').style.display = 'block';
  document.getElementById('emailSignUpForm').style.display = 'none';
  document.getElementById('forgotPasswordForm').style.display = 'none';
  hideLoginMsg();
}
function showForgotPassword(){
  document.getElementById('emailSignInForm').style.display = 'none';
  document.getElementById('emailSignUpForm').style.display = 'none';
  document.getElementById('forgotPasswordForm').style.display = 'block';
  hideLoginMsg();
}
function checkPassStrength(pass){
  var el = document.getElementById('passStrength');
  if(!el) return;
  var s = 0;
  if(pass.length >= 8) s++;
  if(pass.length >= 12) s++;
  if(/[A-Z]/.test(pass)) s++;
  if(/[0-9]/.test(pass)) s++;
  if(/[^A-Za-z0-9]/.test(pass)) s++;
  var labels = ['', 'ضعيفة جداً', 'ضعيفة', 'متوسطة', 'قوية', 'قوية جداً'];
  var colors = ['', '#EF4444', '#F59E0B', '#EAB308', '#22C55E', '#10B981'];
  if(pass.length === 0){ el.textContent = ''; return; }
  el.textContent = 'قوة كلمة السر: ' + labels[s];
  el.style.color = colors[s];
}

async function signInWithGoogle(){
  hideLoginMsg();
  try{
    var result = await sb.auth.signInWithOAuth({provider:'google', options:{redirectTo:window.location.origin}});
    if(result.error) showLoginMsg('خطأ: ' + result.error.message, 'error');
  }catch(e){ showLoginMsg('خطأ في الاتصال', 'error'); }
}

async function signInWithEmail(){
  var email = document.getElementById('signinEmail').value.trim();
  var password = document.getElementById('signinPassword').value;
  if(!email || !password){ showLoginMsg('املأ الإيميل وكلمة السر', 'warning'); return; }
  var btn = document.getElementById('signinBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner sm"></div> جاري الدخول...';
  try{
    var result = await sb.auth.signInWithPassword({email:email, password:password});
    if(result.error){
      showLoginMsg('خطأ: ' + result.error.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> تسجيل الدخول';
      return;
    }
    showLoginMsg('تم تسجيل الدخول!', 'success');
  }catch(e){
    showLoginMsg('خطأ في الاتصال', 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> تسجيل الدخول';
  }
}

async function signUpWithEmail(){
  var name = document.getElementById('signupName').value.trim();
  var email = document.getElementById('signupEmail').value.trim();
  var password = document.getElementById('signupPassword').value;
  var password2 = document.getElementById('signupPassword2').value;
  if(!name || !email || !password){ showLoginMsg('املأ كل الحقول', 'warning'); return; }
  if(password.length < 8){ showLoginMsg('كلمة السر لازم 8 أحرف على الأقل', 'warning'); return; }
  if(password !== password2){ showLoginMsg('كلمتا السر ما متطابقتين', 'warning'); return; }
  var btn = document.getElementById('signupBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner sm"></div> جاري إنشاء الحساب...';
  try{
    var result = await sb.auth.signUp({email:email, password:password, options:{data:{full_name:name}}});
    if(result.error){
      showLoginMsg('خطأ: ' + result.error.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> إنشاء حساب';
      return;
    }
    if(result.data && result.data.user && !result.data.session){
      showLoginMsg('✅ تم إنشاء الحساب! افتح إيميلك وأكّد الحساب.', 'success');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> إنشاء حساب';
      return;
    }
    showLoginMsg('تم إنشاء الحساب!', 'success');
  }catch(e){
    showLoginMsg('خطأ في الاتصال', 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> إنشاء حساب';
  }
}

async function sendResetEmail(){
  var email = document.getElementById('forgotEmail').value.trim();
  if(!email){ showLoginMsg('اكتب إيميلك', 'warning'); return; }
  var btn = document.getElementById('forgotBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner sm"></div> جاري الإرسال...';
  try{
    var result = await sb.auth.resetPasswordForEmail(email, {redirectTo:window.location.origin + '/reset-password.html'});
    if(result.error) showLoginMsg('خطأ: ' + result.error.message, 'error');
    else showLoginMsg('✅ تم إرسال الرابط! افتح إيميلك.', 'success');
  }catch(e){ showLoginMsg('خطأ في الاتصال', 'error'); }
  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> إرسال الرابط';
}

async function signOut(){
  if(!confirm('تسجيل الخروج؟')) return;
  await sb.auth.signOut();
  location.reload();
}

function showLogin(){
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appContainer').style.display = 'none';
  document.getElementById('loadingScreen').classList.remove('show');
}
function showApp(){
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appContainer').style.display = 'flex';
  document.getElementById('loadingScreen').classList.remove('show');
}

sb.auth.onAuthStateChange(async function(event, session){
  if(event === 'PASSWORD_RECOVERY') return;
  if(session && session.user){
    currentUser = session.user;
    showApp();
    renderUserInfo(session.user);
    await loadAllData();
    await checkAdminStatus();
    navigateTo('subjects');
  }else{
    currentUser = null;
    isAdmin = false;
    showLogin();
  }
});

function renderUserInfo(user){
  var meta = user.user_metadata || {};
  var name = meta.full_name || meta.name || user.email || 'مستخدم';
  var avatar = meta.avatar_url || meta.picture || '';
  var nameEl = document.getElementById('userName');
  var emailEl = document.getElementById('userEmail');
  var avatarEl = document.getElementById('userAvatar');
  if(nameEl) nameEl.textContent = name;
  if(emailEl) emailEl.textContent = user.email || '';
  if(avatarEl){
    if(avatar) avatarEl.innerHTML = '<img src="' + avatar + '" alt="">';
    else{
      var initial = name.charAt(0).toUpperCase();
      if(initial && initial !== '@') avatarEl.innerHTML = '<span style="font-size:17px;font-weight:800">' + escapeHtml(initial) + '</span>';
      else avatarEl.innerHTML = '<i class="fa-solid fa-user"></i>';
    }
  }
}

async function checkAdminStatus(){
  if(!currentUser) return;
  try{
    var result = await sb.from('admins').select('id').eq('user_id', currentUser.id).maybeSingle();
    isAdmin = !!result.data;
  }catch(e){ isAdmin = false; }
}

function playSound(type){
  if(!soundEnabled) return;
  try{
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if(!AudioCtx) return;
    var ctx = new AudioCtx();
    var gain = ctx.createGain();
    gain.connect(ctx.destination);
    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    osc.connect(gain);
    osc.type = 'sine';
    if(type === 'success'){
      osc.frequency.setValueAtTime(523, now);
      osc.frequency.setValueAtTime(659, now + 0.1);
      osc.frequency.setValueAtTime(783, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now); osc.stop(now + 0.4);
    }else if(type === 'complete'){
      [523, 659, 783, 1046].forEach(function(f, i){ osc.frequency.setValueAtTime(f, now + i * 0.1); });
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.start(now); osc.stop(now + 0.6);
    }else if(type === 'click'){
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now); osc.stop(now + 0.05);
    }else if(type === 'error'){
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.25);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now); osc.stop(now + 0.25);
    }
  }catch(e){}
}

function celebrate(){
  if(typeof confetti === 'undefined') return;
  confetti({particleCount:50, spread:360, origin:{y:0.6}, colors:['#FF7A00','#FFB74D','#E65100','#FFD54F','#8B5CF6'], shapes:['star','circle']});
}
function bigCelebrate(){
  if(typeof confetti === 'undefined') return;
  var colors = ['#FF7A00','#FFB74D','#E65100','#FFD54F','#8B5CF6','#fff'];
  var end = Date.now() + 2000;
  (function frame(){
    confetti({particleCount:5, angle:60, spread:55, origin:{x:0}, colors:colors});
    confetti({particleCount:5, angle:120, spread:55, origin:{x:1}, colors:colors});
    if(Date.now() < end) requestAnimationFrame(frame);
  })();
  confetti({particleCount:120, spread:100, origin:{y:0.5}, colors:colors});
}

function autoTheme(){
  if(localStorage.getItem('theme_manual') === 'true'){
    var saved = localStorage.getItem('theme_value') || 'dark';
    document.body.setAttribute('data-mode', saved);
    return;
  }
  var hour = new Date().getHours();
  var isNight = (hour >= 19 || hour < 5);
  var mode = isNight ? 'dark' : 'light';
  document.body.setAttribute('data-mode', mode);
  localStorage.setItem('theme_value', mode);
  if(typeof state !== 'undefined' && state.settings) state.settings.mode = mode;
}
function updateTimeWallpaper(){
  var hour = new Date().getHours();
  var time = 'day';
  if(hour >= 5 && hour < 12) time = 'day';
  else if(hour >= 12 && hour < 17) time = 'afternoon';
  else if(hour >= 17 && hour < 20) time = 'evening';
  else time = 'night';
  document.body.setAttribute('data-time', time);
}
function applyTheme(){
  var settings = state.settings;
  document.body.setAttribute('data-theme', settings.theme || 'orange');
  autoTheme();
  updateTimeWallpaper();
  saveSettings();
}
function changeTheme(theme){
  state.settings.theme = theme;
  document.body.setAttribute('data-theme', theme);
  document.querySelectorAll('.theme-option').forEach(function(d){ d.classList.toggle('selected', d.dataset.theme === theme); });
  saveSettings();
  toast('تم تغيير الثيم', 'success');
}
function toggleThemeMode(){
  state.settings.mode = state.settings.mode === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme_manual', 'true');
  localStorage.setItem('theme_value', state.settings.mode);
  document.body.setAttribute('data-mode', state.settings.mode);
  toast('الوضع: ' + (state.settings.mode === 'dark' ? 'ليلي' : 'نهاري'), 'info');
}
function changeFont(font){
  state.settings.font = font;
  document.body.style.fontFamily = "'" + font + "','Segoe UI',Tahoma,sans-serif";
  document.querySelectorAll('.font-option').forEach(function(o){ o.classList.toggle('selected', o.dataset.font === font); });
  saveSettings();
  toast('تم تغيير الخط', 'success');
}
function saveSettings(){ localStorage.setItem('mizkarati_settings', JSON.stringify(state.settings)); }
function loadSettings(){ try{ var saved = JSON.parse(localStorage.getItem('mizkarati_settings') || '{}'); Object.assign(state.settings, saved); }catch(e){} }

function toggleMusic(){
  var audio = document.getElementById('bgMusic');
  var btn = document.getElementById('musicBtn');
  if(!audio || !btn) return;
  if(musicPlaying){
    audio.pause();
    musicPlaying = false;
    btn.classList.remove('playing');
    btn.innerHTML = '<i class="fa-solid fa-music"></i>';
    toast('🎵 تم إيقاف الموسيقى', 'info');
  }else{
    audio.volume = 0.3;
    audio.play().then(function(){
      musicPlaying = true;
      btn.classList.add('playing');
      btn.innerHTML = '<i class="fa-solid fa-pause"></i>';
      toast('🎵 موسيقى التركيز تعمل', 'success');
    }).catch(function(){ toast('⚠️ اضغط مرة ثانية', 'warning'); });
  }
}

function toggleSidebar(){
  var sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('collapsed');
  localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed'));
}
function toggleMobileSidebar(){
  var sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('show');
  if(sidebar.classList.contains('show')){
    setTimeout(function(){ document.addEventListener('click', closeSidebarOnClick); }, 100);
  }
}
function closeSidebarOnClick(e){
  var sidebar = document.getElementById('sidebar');
  if(!sidebar.contains(e.target) && !e.target.closest('.topbar-mobile-menu')){
    sidebar.classList.remove('show');
    document.removeEventListener('click', closeSidebarOnClick);
  }
}
function toggleRightPanel(){ document.getElementById('rightPanel').classList.toggle('collapsed'); }

var PAGE_TITLES = {
  subjects:{title:'مكتبتي', subtitle:'نظّم دروسك بطريقة ذكية'},
  subject:{title:'المادة', subtitle:'دروس المادة'},
  lesson:{title:'الدرس', subtitle:'تفاصيل الدرس'},
  calendar:{title:'التقويم', subtitle:'المواعيد والمراجعات'},
  monthly:{title:'التقويم الشهري', subtitle:'نظرة شاملة'},
  tasks:{title:'المهام', subtitle:'مهامك اليومية'},
  stats:{title:'الإحصائيات', subtitle:'تقدمك في الدراسة'},
  achievements:{title:'الإنجازات', subtitle:'شاراتك ونجاحاتك'},
  challenge:{title:'التحدي اليومي', subtitle:'اكسب XP وارتقِ بالمستويات'}
};

function navigateTo(page, options){
  options = options || {};
  currentPage = page;
  var titles = PAGE_TITLES[page] || {title:'مِذكَرتي', subtitle:''};
  var titleEl = document.getElementById('pageTitle');
  var subEl = document.getElementById('pageSubtitle');
  if(titleEl) titleEl.textContent = titles.title;
  if(subEl) subEl.textContent = titles.subtitle;
  document.querySelectorAll('.nav-item[data-page]').forEach(function(item){ item.classList.toggle('active', item.dataset.page === page); });
  document.querySelectorAll('.bottom-tab[data-tab]').forEach(function(item){ item.classList.toggle('active', item.dataset.tab === page); });
  if(window.innerWidth < 768) document.getElementById('sidebar').classList.remove('show');
  document.getElementById('notifPanel').classList.remove('show');
  renderPage(page, options);
  var content = document.getElementById('content');
  if(content) content.scrollTop = 0;
}

function renderPage(page, options){
  var content = document.getElementById('content');
  if(!content) return;
  content.innerHTML = '<div class="content-page"></div>';
  var pageEl = content.querySelector('.content-page');
  switch(page){
    case 'subjects': renderSubjectsPage(pageEl); break;
    case 'subject': renderSubjectPage(pageEl, options.subjectId); break;
    case 'lesson': renderLessonPage(pageEl, options.subjectId, options.lessonId); break;
    case 'calendar': renderCalendarPage(pageEl); break;
    case 'monthly': renderMonthlyPage(pageEl); break;
    case 'tasks': renderTasksPage(pageEl); break;
    case 'stats': renderStatsPage(pageEl); break;
    case 'achievements': renderAchievementsPage(pageEl); break;
    case 'challenge': renderChallengePage(pageEl); break;
    default: renderSubjectsPage(pageEl);
  }
  renderRightPanel();
}

function toggleNotifPanel(){
  var panel = document.getElementById('notifPanel');
  panel.classList.toggle('show');
  if(panel.classList.contains('show')) renderNotifList();
}
document.addEventListener('click', function(e){
  var panel = document.getElementById('notifPanel');
  if(panel && panel.classList.contains('show')){
    if(!panel.contains(e.target) && !e.target.closest('.icon-btn')) panel.classList.remove('show');
  }
});

async function loadAllData(){
  if(!currentUser) return;
  try{
    var results = await Promise.all([
      sb.from('subjects').select('*').order('created_at'),
      sb.from('lessons').select('*'),
      sb.from('cards').select('*'),
      sb.from('schedule').select('*'),
      sb.from('notifications').select('*').order('created_at',{ascending:false}).limit(100),
      sb.from('grades').select('*').order('created_at'),
      sb.from('daily_challenges').select('*').eq('challenge_date', new Date().toISOString().split('T')[0]),
      sb.from('user_stats').select('*').eq('user_id', currentUser.id).maybeSingle(),
      sb.from('tasks').select('*').order('created_at',{ascending:false}),
      sb.from('exams').select('*').order('exam_date',{ascending:true}),
      sb.from('news').select('*').order('created_at',{ascending:false}).limit(50),
      sb.from('announcements').select('*').order('created_at',{ascending:false}).limit(50)
    ]);
    var s = results[0], l = results[1], c = results[2], sc = results[3];
    var n = results[4], g = results[5], ch = results[6], us = results[7], tk = results[8];
    var ex = results[9], nw = results[10], an = results[11];

    state.subjects = (s.data || []).map(function(sub){
      return {
        id: sub.id, name: sub.name,
        icon: sub.icon || 'fa-book',
        color: sub.color || '#FF7A00',
        colorDark: sub.color_dark || '#E65100',
        pinned: sub.pinned || false,
        lessons: (l.data || []).filter(function(x){ return x.subject_id === sub.id; }).map(function(les){
          return {
            id: les.id, title: les.title,
            status: les.status || 'new',
            date: les.lesson_date,
            notes: les.notes || '',
            favorite: les.is_favorite || false,
            feynman: {done: les.feynman_done || false, text: les.feynman_text || ''},
            spaced: {stage: les.spaced_stage || 0, history: les.spaced_history || [], nextReview: les.spaced_next_review ? new Date(les.spaced_next_review).getTime() : null},
            cards: (c.data || []).filter(function(x){ return x.lesson_id === les.id; }).map(function(cd){
              return {id: cd.id, q: cd.q, a: cd.a, level: cd.level || 2, box: cd.box || 1, nextReview: cd.next_review ? new Date(cd.next_review).getTime() : Date.now()};
            })
          };
        })
      };
    });

    state.schedule = (sc.data || []).map(function(x){ return {id:x.id, type:x.type, day:x.day, title:x.title, time:x.time}; });
    state.notifications = (n.data || []).map(function(x){ return {id:x.id, type:x.type, title:x.title, body:x.body, time:new Date(x.created_at).getTime(), read:x.read}; });
    state.grades = g.data || [];
    state.challenges = ch.data || [];
    state.userStats = us.data;
    state.tasks = tk.data || [];
    state.exams = ex.data || [];
    state.news = nw.data || [];
    state.announcements = an.data || [];

    if(!state.userStats){
      var newStats = await sb.from('user_stats').insert({user_id: currentUser.id}).select().single();
      if(newStats.data) state.userStats = newStats.data;
    }

    await generateDailyChallenge();
    renderNotifBadge();
    renderNotifList();
    renderStreak();
    renderChallengeBadge();
    updateTasksBadge();
    await syncAdminContent();
  }catch(e){ console.error('Load error:', e); }
}

async function syncAdminContent(){
  if(!currentUser || !state.userStats) return;
  var now = Date.now();
  var oneDay = 24 * 60 * 60 * 1000;
  state.exams.forEach(function(exam){
    var examDate = new Date(exam.exam_date).getTime();
    var diff = examDate - now;
    if(diff > 0 && diff < 3 * oneDay){
      var key = 'exam_notif_' + exam.id;
      if(!localStorage.getItem(key)){
        pushNotif('exam', '📝 ' + exam.title, (exam.subject ? exam.subject + ' · ' : '') + fmtDate(exam.exam_date) + (exam.exam_time ? ' · ' + exam.exam_time : ''));
        localStorage.setItem(key, '1');
      }
    }
  });
  var lastSyncKey = 'last_admin_sync_' + currentUser.id;
  var lastSync = parseInt(localStorage.getItem(lastSyncKey) || '0');
  var allContent = []
    .concat(state.announcements.map(function(a){ return {type:'info', title:a.title, body:a.message, time:new Date(a.created_at).getTime(), id:a.id, kind:'ann'}; }))
    .concat(state.news.map(function(n){ return {type:'info', title:n.title, body:n.content.substring(0, 100), time:new Date(n.created_at).getTime(), id:n.id, kind:'news'}; }))
    .sort(function(a, b){ return b.time - a.time; });
  allContent.forEach(function(item){
    if(item.time > lastSync){
      var seenKey = 'admin_seen_' + item.kind + '_' + item.id;
      if(!localStorage.getItem(seenKey)){
        pushNotif(item.type, '📢 ' + item.title, item.body);
        localStorage.setItem(seenKey, '1');
      }
    }
  });
  localStorage.setItem(lastSyncKey, String(now));
}

/* ============ SUBJECTS ============ */
function renderSubjectsPage(el){
  var subjects = state.subjects;
  var totalLessons = 0, totalMemorized = 0, totalCards = 0, totalDue = 0;
  var now = Date.now();
  subjects.forEach(function(s){
    totalLessons += s.lessons.length;
    s.lessons.forEach(function(l){
      if(l.status === 'memorized') totalMemorized++;
      totalCards += l.cards.length;
      l.cards.forEach(function(c){ if(!c.nextReview || c.nextReview <= now) totalDue++; });
    });
  });
  el.innerHTML =
    '<div class="page-header">' +
      '<div class="page-header-left"><h1><i class="fa-solid fa-book-bookmark"></i> مكتبتي</h1><p>نظّم دروسك، تابع تقدمك، واحفظ بذكاء</p></div>' +
      '<div class="page-header-actions"><button class="btn btn-primary" onclick="openSubjectModal()"><i class="fa-solid fa-plus"></i> إضافة مادة</button></div>' +
    '</div>' +
    '<div class="quick-stats">' +
      '<div class="quick-stat"><div class="quick-stat-icon"><i class="fa-solid fa-book"></i></div><div class="quick-stat-body"><div class="quick-stat-num">' + subjects.length + '</div><div class="quick-stat-lbl">مادة</div></div></div>' +
      '<div class="quick-stat"><div class="quick-stat-icon"><i class="fa-solid fa-file-lines"></i></div><div class="quick-stat-body"><div class="quick-stat-num">' + totalLessons + '</div><div class="quick-stat-lbl">درس</div></div></div>' +
      '<div class="quick-stat"><div class="quick-stat-icon"><i class="fa-solid fa-circle-check"></i></div><div class="quick-stat-body"><div class="quick-stat-num">' + totalMemorized + '</div><div class="quick-stat-lbl">محفوظ</div></div></div>' +
      '<div class="quick-stat"><div class="quick-stat-icon"><i class="fa-solid fa-clock"></i></div><div class="quick-stat-body"><div class="quick-stat-num">' + totalDue + '</div><div class="quick-stat-lbl">مستحق</div></div></div>' +
    '</div>' +
    (subjects.length === 0 ? renderEmptySubjects() :
      '<div class="filter-tabs">' +
        '<div class="filter-tab active" onclick="filterSubjects(this, \'all\')"><i class="fa-solid fa-layer-group"></i> الكل <span class="count">' + subjects.length + '</span></div>' +
        '<div class="filter-tab" onclick="filterSubjects(this, \'pinned\')"><i class="fa-solid fa-thumbtack"></i> مثبتة</div>' +
        '<div class="filter-tab" onclick="filterSubjects(this, \'active\')"><i class="fa-solid fa-fire"></i> نشطة</div>' +
        '<div class="filter-tab" onclick="filterSubjects(this, \'done\')"><i class="fa-solid fa-check"></i> مكتملة</div>' +
      '</div>' +
      '<div class="subjects-grid" id="subjectsGrid">' + renderSubjectsCards(subjects) + '</div>'
    );
}

function renderEmptySubjects(){
  return '<div class="empty-state"><div class="empty-state-icon"><i class="fa-solid fa-book-bookmark"></i></div>' +
    '<h2>ابدأ رحلتك الدراسية</h2><p>أضف مادتك الأولى لتبدأ بتنظيم دروسك، ومتابعة تقدمك، وحفظ بطاقاتك بذكاء</p>' +
    '<button class="btn btn-primary btn-lg" onclick="openSubjectModal()"><i class="fa-solid fa-plus"></i> إضافة مادة جديدة</button></div>';
}

function renderSubjectsCards(subjects){
  var cards = subjects.map(function(s){ return renderSubjectCard(s); }).join('');
  cards += '<div class="add-subject-card" onclick="openSubjectModal()">' +
    '<div class="add-subject-icon"><i class="fa-solid fa-plus"></i></div>' +
    '<div class="add-subject-label">إضافة مادة جديدة</div></div>';
  return cards;
}

function renderSubjectCard(s){
  var lessons = s.lessons || [];
  var total = lessons.length;
  var memorized = lessons.filter(function(l){ return l.status === 'memorized'; }).length;
  var cards = 0, due = 0, now = Date.now();
  lessons.forEach(function(l){
    cards += l.cards.length;
    l.cards.forEach(function(c){ if(!c.nextReview || c.nextReview <= now) due++; });
  });
  var pct = total ? Math.round(memorized/total*100) : 0;
  return '<div class="subject-card" style="--subject-color:' + s.color + ';--subject-color-dark:' + s.colorDark + '" onclick="openSubject(\'' + s.id + '\')">' +
    (s.pinned ? '<div class="subject-pin"><i class="fa-solid fa-thumbtack"></i></div>' : '') +
    '<div class="subject-card-head">' +
      '<div class="subject-icon"><i class="fa-solid ' + s.icon + '"></i></div>' +
      '<div class="subject-card-actions">' +
        '<button class="subject-card-action" onclick="event.stopPropagation();togglePin(\'' + s.id + '\')" title="تثبيت"><i class="fa-solid fa-thumbtack"></i></button>' +
        '<button class="subject-card-action" onclick="event.stopPropagation();openEditSubjectModal(\'' + s.id + '\')" title="تعديل"><i class="fa-solid fa-pen"></i></button>' +
        '<button class="subject-card-action danger" onclick="event.stopPropagation();deleteSubject(\'' + s.id + '\')" title="حذف"><i class="fa-solid fa-trash"></i></button>' +
      '</div>' +
    '</div>' +
    '<div class="subject-card-body">' +
      '<div class="subject-card-name">' + escapeHtml(s.name) + '</div>' +
      '<div class="subject-card-meta">' +
        '<span><i class="fa-solid fa-file-lines"></i> ' + total + ' درس</span>' +
        '<span><i class="fa-solid fa-layer-group"></i> ' + cards + ' بطاقة</span>' +
        (due > 0 ? '<span style="color:var(--red)"><i class="fa-solid fa-clock"></i> ' + due + ' مستحق</span>' : '') +
      '</div>' +
    '</div>' +
    '<div class="subject-progress">' +
      '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="progress-info"><span>' + memorized + '/' + total + ' محفوظ</span><span class="pct">' + pct + '%</span></div>' +
    '</div>' +
  '</div>';
}

function filterSubjects(tab, filter){
  document.querySelectorAll('.filter-tab').forEach(function(t){ t.classList.remove('active'); });
  tab.classList.add('active');
  var subjects = [].concat(state.subjects);
  if(filter === 'pinned') subjects = subjects.filter(function(s){ return s.pinned; });
  else if(filter === 'active') subjects = subjects.filter(function(s){ return s.lessons.some(function(l){ return l.status !== 'memorized'; }); });
  else if(filter === 'done') subjects = subjects.filter(function(s){ return s.lessons.length > 0 && s.lessons.every(function(l){ return l.status === 'memorized'; }); });
  subjects.sort(function(a,b){ if(a.pinned && !b.pinned) return -1; if(!a.pinned && b.pinned) return 1; return 0; });
  var grid = document.getElementById('subjectsGrid');
  if(!grid) return;
  if(subjects.length === 0){
    var labels = {all:'لا مواد بعد', pinned:'لا مواد مثبتة', active:'لا مواد نشطة', done:'لا مواد مكتملة'};
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;min-height:30vh">' +
      '<div class="empty-state-icon"><i class="fa-solid fa-filter-circle-xmark"></i></div>' +
      '<h2>' + (labels[filter] || 'لا نتائج') + '</h2><p>جرب فلتر آخر</p></div>';
    return;
  }
  grid.innerHTML = renderSubjectsCards(subjects);
}

/* ============ SUBJECT MODAL ============ */
var editingSubjectId = null;
var selectedSubjectIcon = 'fa-book';
var selectedSubjectColor = '#FF7A00';

function openSubjectModal(){
  editingSubjectId = null;
  selectedSubjectIcon = 'fa-book';
  selectedSubjectColor = '#FF7A00';
  document.getElementById('subjectModalTitle').textContent = 'إضافة مادة';
  document.getElementById('subjectNameInput').value = '';
  renderSubjectIconPicker();
  renderSubjectColorPicker();
  openModal('subjectModal');
  setTimeout(function(){ document.getElementById('subjectNameInput').focus(); }, 300);
}
function openEditSubjectModal(id){
  var s = state.subjects.find(function(x){ return x.id === id; });
  if(!s) return;
  editingSubjectId = id;
  selectedSubjectIcon = s.icon;
  selectedSubjectColor = s.color;
  document.getElementById('subjectModalTitle').textContent = 'تعديل المادة';
  document.getElementById('subjectNameInput').value = s.name;
  renderSubjectIconPicker();
  renderSubjectColorPicker();
  openModal('subjectModal');
}
function renderSubjectIconPicker(){
  var picker = document.getElementById('subjectIconPicker');
  if(!picker) return;
  picker.innerHTML = ICONS.map(function(ic){
    return '<div class="icon-pick ' + (ic === selectedSubjectIcon ? 'selected' : '') + '" onclick="pickSubjectIcon(\'' + ic + '\')"><i class="fa-solid ' + ic + '"></i></div>';
  }).join('');
}
function pickSubjectIcon(ic){ selectedSubjectIcon = ic; renderSubjectIconPicker(); }
function renderSubjectColorPicker(){
  var picker = document.getElementById('subjectColorPicker');
  if(!picker) return;
  picker.innerHTML = COLORS.map(function(c){
    return '<div class="color-dot ' + (c.hex === selectedSubjectColor ? 'selected' : '') + '" style="background:linear-gradient(135deg,' + c.hex + ',' + c.dark + ')" onclick="pickSubjectColor(\'' + c.hex + '\',\'' + c.dark + '\')" title="' + c.name + '"></div>';
  }).join('');
}
function pickSubjectColor(hex, dark){ selectedSubjectColor = hex; state._selectedColorDark = dark; renderSubjectColorPicker(); }

async function saveSubject(){
  var name = document.getElementById('subjectNameInput').value.trim();
  if(!name){ toast('اكتب اسم المادة', 'warning'); return; }
  var colorObj = COLORS.find(function(c){ return c.hex === selectedSubjectColor; }) || COLORS[0];
  if(editingSubjectId){
    var result = await sb.from('subjects').update({name:name, icon:selectedSubjectIcon, color:colorObj.hex, color_dark:colorObj.dark}).eq('id', editingSubjectId).select().single();
    if(result.error){ toast('خطأ: ' + result.error.message, 'error'); return; }
    var s = state.subjects.find(function(x){ return x.id === editingSubjectId; });
    if(s){ s.name = name; s.icon = selectedSubjectIcon; s.color = colorObj.hex; s.colorDark = colorObj.dark; }
    toast('تم تحديث المادة', 'success');
  } else {
    var result = await sb.from('subjects').insert({user_id: currentUser.id, name:name, icon:selectedSubjectIcon, color:colorObj.hex, color_dark:colorObj.dark}).select().single();
    if(result.error){ toast('خطأ: ' + result.error.message, 'error'); return; }
    state.subjects.push({id:result.data.id, name:result.data.name, icon:result.data.icon, color:result.data.color, colorDark:result.data.color_dark, pinned:false, lessons:[]});
    toast('تمت إضافة المادة', 'success');
    playSound('success');
    celebrate();
  }
  closeModal('subjectModal');
  editingSubjectId = null;
  updateStreak();
  checkAchievements();
  navigateTo(currentPage);
}

async function deleteSubject(id){
  if(!confirm('حذف المادة وكل دروسها؟')) return;
  var result = await sb.from('subjects').delete().eq('id', id);
  if(result.error){ toast('خطأ في الحذف', 'error'); return; }
  state.subjects = state.subjects.filter(function(s){ return s.id !== id; });
  toast('تم الحذف', 'success');
  navigateTo('subjects');
}

async function togglePin(id){
  var s = state.subjects.find(function(x){ return x.id === id; });
  if(!s) return;
  s.pinned = !s.pinned;
  await sb.from('subjects').update({pinned: s.pinned}).eq('id', id);
  toast(s.pinned ? 'تم التثبيت' : 'تم إلغاء التثبيت', 'success');
  navigateTo(currentPage);
}

/* ============ SUBJECT PAGE ============ */
function openSubject(id){ currentSubjectId = id; navigateTo('subject', {subjectId: id}); }

function renderSubjectPage(el, subjectId){
  var s = state.subjects.find(function(x){ return x.id === subjectId; });
  if(!s){ el.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i class="fa-solid fa-triangle-exclamation"></i></div><h2>المادة غير موجودة</h2><button class="btn btn-primary" onclick="navigateTo(\'subjects\')">رجوع</button></div>'; return; }
  currentSubjectId = subjectId;
  var lessons = s.lessons || [];
  var total = lessons.length;
  var memorized = lessons.filter(function(l){ return l.status === 'memorized'; }).length;
  var cards = 0, due = 0, now = Date.now();
  lessons.forEach(function(l){ cards += l.cards.length; l.cards.forEach(function(c){ if(!c.nextReview || c.nextReview <= now) due++; }); });
  var pct = total ? Math.round(memorized/total*100) : 0;

  el.innerHTML =
    '<button class="back-btn" onclick="navigateTo(\'subjects\')"><i class="fa-solid fa-arrow-right"></i> رجوع للمواد</button>' +
    '<div class="subject-hero" style="--subject-color:' + s.color + ';--subject-color-dark:' + s.colorDark + '">' +
      '<div class="subject-hero-content">' +
        '<div class="subject-hero-icon"><i class="fa-solid ' + s.icon + '"></i></div>' +
        '<div class="subject-hero-info">' +
          '<h1>' + escapeHtml(s.name) + '</h1>' +
          '<p><span><i class="fa-solid fa-file-lines"></i> ' + total + ' درس</span>' +
          '<span><i class="fa-solid fa-layer-group"></i> ' + cards + ' بطاقة</span>' +
          (due > 0 ? '<span><i class="fa-solid fa-clock"></i> ' + due + ' مستحق</span>' : '') + '</p>' +
          '<div class="subject-hero-stats">' +
            '<div class="subject-hero-stat"><div class="num">' + memorized + '</div><div class="lbl">محفوظ</div></div>' +
            '<div class="subject-hero-stat"><div class="num">' + pct + '%</div><div class="lbl">التقدم</div></div>' +
            '<div class="subject-hero-stat"><div class="num">' + (total - memorized) + '</div><div class="lbl">متبقي</div></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="filter-tabs">' +
      '<div class="filter-tab active" onclick="filterLessons(this, \'all\')"><i class="fa-solid fa-layer-group"></i> الكل <span class="count">' + total + '</span></div>' +
      '<div class="filter-tab" onclick="filterLessons(this, \'new\')"><i class="fa-solid fa-circle"></i> جديد</div>' +
      '<div class="filter-tab" onclick="filterLessons(this, \'reading\')"><i class="fa-solid fa-book-open"></i> قيد الفهم</div>' +
      '<div class="filter-tab" onclick="filterLessons(this, \'partial\')"><i class="fa-solid fa-circle-half-stroke"></i> جزئي</div>' +
      '<div class="filter-tab" onclick="filterLessons(this, \'memorized\')"><i class="fa-solid fa-circle-check"></i> محفوظ</div>' +
      '<div class="filter-tab" onclick="filterLessons(this, \'favorites\')"><i class="fa-solid fa-star"></i> مفضلة</div>' +
    '</div>' +
    '<div class="page-header-actions" style="margin-bottom:16px">' +
      '<button class="btn btn-primary" onclick="openLessonModal()"><i class="fa-solid fa-plus"></i> إضافة درس</button>' +
    '</div>' +
    '<div class="lessons-list" id="lessonsList">' +
      (total === 0 ? renderEmptyLessons() : lessons.map(renderLessonCard).join('')) +
    '</div>';
}

function renderEmptyLessons(){
  return '<div class="empty-state" style="min-height:40vh"><div class="empty-state-icon"><i class="fa-solid fa-file-circle-plus"></i></div>' +
    '<h2>لا توجد دروس بعد</h2><p>أضف درسك الأول لتبدأ بتنظيمه وفهمه وحفظه</p>' +
    '<button class="btn btn-primary" onclick="openLessonModal()"><i class="fa-solid fa-plus"></i> إضافة درس</button></div>';
}

function renderLessonCard(l){
  var now = Date.now();
  var due = l.cards.filter(function(c){ return !c.nextReview || c.nextReview <= now; }).length;
  var memorized = l.cards.filter(function(c){ return c.level === 3; }).length;
  var total = l.cards.length;
  var pct = total ? Math.round(memorized/total*100) : 0;
  var statusLabels = {new:'جديد', reading:'قيد الفهم', partial:'جزئي', memorized:'محفوظ', needs_review:'مراجعة'};
  return '<div class="lesson-card" data-status="' + l.status + '" onclick="openLesson(\'' + l.id + '\')">' +
    '<div class="lesson-status"></div>' +
    '<div class="lesson-content">' +
      '<div class="lesson-title">' + escapeHtml(l.title) + (l.favorite ? ' <i class="fa-solid fa-star fav-star"></i>' : '') + '</div>' +
      '<div class="lesson-meta">' +
        '<span><i class="fa-solid fa-layer-group"></i> ' + total + ' بطاقة</span>' +
        (due > 0 ? '<span style="color:var(--red)"><i class="fa-solid fa-clock"></i> ' + due + ' مستحق</span>' : '') +
        '<span class="lesson-badge' + (due > 0 ? ' due' : '') + '">' + (statusLabels[l.status] || 'جديد') + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="lesson-mini-progress"><div class="fill" style="width:' + pct + '%"></div></div>' +
    '<i class="fa-solid fa-chevron-left lesson-chev"></i>' +
  '</div>';
}

function filterLessons(tab, filter){
  document.querySelectorAll('.filter-tab').forEach(function(t){ t.classList.remove('active'); });
  tab.classList.add('active');
  var s = state.subjects.find(function(x){ return x.id === currentSubjectId; });
  if(!s) return;
  var lessons = [].concat(s.lessons);
  if(filter === 'favorites') lessons = lessons.filter(function(l){ return l.favorite; });
  else if(filter !== 'all') lessons = lessons.filter(function(l){ return l.status === filter; });
  var list = document.getElementById('lessonsList');
  if(!list) return;
  if(lessons.length === 0){
    var labels = {all:'لا دروس بعد', new:'لا دروس جديدة', reading:'لا دروس قيد الفهم', partial:'لا دروس جزئية', memorized:'لا دروس محفوظة', needs_review:'لا دروس تحتاج مراجعة', favorites:'لا دروس في المفضلة'};
    list.innerHTML = '<div class="empty-state" style="min-height:30vh"><div class="empty-state-icon"><i class="fa-solid fa-file-circle-question"></i></div><h2>' + (labels[filter] || 'لا نتائج') + '</h2><p>جرب فلتر آخر</p></div>';
    return;
  }
  list.innerHTML = lessons.map(renderLessonCard).join('');
}

/* ============ LESSON MODAL ============ */
var editingLessonId = null;
function openLessonModal(){
  editingLessonId = null;
  document.getElementById('lessonModalTitle').textContent = 'إضافة درس';
  document.getElementById('lessonTitleInput').value = '';
  document.getElementById('lessonDateInput').value = '';
  document.getElementById('lessonNotesInput').value = '';
  openModal('lessonModal');
  setTimeout(function(){ document.getElementById('lessonTitleInput').focus(); }, 300);
}
function openEditLessonModal(id){
  var s = state.subjects.find(function(x){ return x.id === currentSubjectId; });
  if(!s) return;
  var l = s.lessons.find(function(x){ return x.id === id; });
  if(!l) return;
  editingLessonId = id;
  document.getElementById('lessonModalTitle').textContent = 'تعديل الدرس';
  document.getElementById('lessonTitleInput').value = l.title;
  document.getElementById('lessonDateInput').value = l.date || '';
  document.getElementById('lessonNotesInput').value = l.notes || '';
  openModal('lessonModal');
}

async function saveLesson(){
  var title = document.getElementById('lessonTitleInput').value.trim();
  var date = document.getElementById('lessonDateInput').value;
  var notes = document.getElementById('lessonNotesInput').value.trim();
  if(!title){ toast('اكتب عنوان الدرس', 'warning'); return; }
  if(editingLessonId){
    var result = await sb.from('lessons').update({title:title, lesson_date:date || null, notes:notes}).eq('id', editingLessonId).select().single();
    if(result.error){ toast('خطأ: ' + result.error.message, 'error'); return; }
    var s = state.subjects.find(function(x){ return x.id === currentSubjectId; });
    if(s){ var l = s.lessons.find(function(x){ return x.id === editingLessonId; }); if(l){ l.title = title; l.date = date; l.notes = notes; } }
    toast('تم التحديث', 'success');
  } else {
    var nextReview = new Date(Date.now() + SPACED_INTERVALS[0]*24*60*60*1000).toISOString();
    var result = await sb.from('lessons').insert({
      subject_id: currentSubjectId, user_id: currentUser.id, title:title,
      status:'new', feynman_done:false, feynman_text:'',
      spaced_stage:0, spaced_history:[], spaced_next_review:nextReview,
      lesson_date:date || null, notes:notes
    }).select().single();
    if(result.error){ toast('خطأ: ' + result.error.message, 'error'); return; }
    var s = state.subjects.find(function(x){ return x.id === currentSubjectId; });
    if(s){
      s.lessons.push({
        id: result.data.id, title:title, status:'new', date:date || null, notes:notes, favorite:false,
        feynman:{done:false, text:''},
        spaced:{stage:0, history:[], nextReview:new Date(nextReview).getTime()},
        cards:[]
      });
    }
    toast('تمت إضافة الدرس', 'success');
    playSound('success');
    celebrate();
  }
  closeModal('lessonModal');
  editingLessonId = null;
  updateStreak();
  checkAchievements();
  navigateTo('subject', {subjectId: currentSubjectId});
}

async function deleteLesson(id){
  if(!confirm('حذف هذا الدرس؟')) return;
  var result = await sb.from('lessons').delete().eq('id', id);
  if(result.error){ toast('خطأ في الحذف', 'error'); return; }
  var s = state.subjects.find(function(x){ return x.id === currentSubjectId; });
  if(s) s.lessons = s.lessons.filter(function(l){ return l.id !== id; });
  toast('تم الحذف', 'success');
  navigateTo('subject', {subjectId: currentSubjectId});
}

async function toggleLessonFavorite(id){
  var s = state.subjects.find(function(x){ return x.id === currentSubjectId; });
  if(!s) return;
  var l = s.lessons.find(function(x){ return x.id === id; });
  if(!l) return;
  l.favorite = !l.favorite;
  await sb.from('lessons').update({is_favorite: l.favorite}).eq('id', id);
  toast(l.favorite ? 'أضيف للمفضلة' : 'أزيل من المفضلة', 'success');
  navigateTo('lesson', {subjectId: currentSubjectId, lessonId: id});
}

/* ============ LESSON PAGE ============ */
function openLesson(id){ currentLessonId = id; navigateTo('lesson', {subjectId: currentSubjectId, lessonId: id}); }

function renderLessonPage(el, subjectId, lessonId){
  var s = state.subjects.find(function(x){ return x.id === subjectId; });
  if(!s){ el.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i class="fa-solid fa-triangle-exclamation"></i></div><h2>غير موجود</h2></div>'; return; }
  var l = s.lessons.find(function(x){ return x.id === lessonId; });
  if(!l){ el.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i class="fa-solid fa-triangle-exclamation"></i></div><h2>الدرس غير موجود</h2></div>'; return; }
  currentSubjectId = subjectId;
  currentLessonId = lessonId;
  var now = Date.now();
  var due = l.cards.filter(function(c){ return !c.nextReview || c.nextReview <= now; }).length;
  var spaced = l.spaced || {stage:0, history:[]};
  var spacedHtml = SPACED_INTERVALS.map(function(days, i){
    var done = spaced.history && spaced.history[i];
    var dueNow = !done && (i === 0 || (spaced.history && spaced.history[i-1])) && spaced.stage === i;
    var cls = done ? 'done' : (dueNow ? 'due' : '');
    var icon = done ? 'fa-check' : (dueNow ? 'fa-clock' : 'fa-circle');
    return '<div class="sched-item ' + cls + '"><i class="fa-solid ' + icon + '"></i> J+' + days + '</div>';
  }).join('');
  var statusLabels = {
    new:{l:'جديد', i:'fa-circle'},
    reading:{l:'قيد الفهم', i:'fa-book-open-reader'},
    partial:{l:'محفوظ جزئي', i:'fa-circle-half-stroke'},
    memorized:{l:'محفوظ', i:'fa-circle-check'},
    needs_review:{l:'يحتاج مراجعة', i:'fa-rotate'}
  };
  var permBanner = (('Notification' in window) && Notification.permission === 'default') ?
    '<div style="background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:#fff;padding:14px 18px;border-radius:12px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">' +
      '<span style="font-size:13px"><i class="fa-solid fa-bell"></i> فعّل إشعارات المتصفح لتصلك تنبيهات المراجعة</span>' +
      '<button class="btn btn-sm" onclick="requestNotifPermission()" style="background:#fff;color:var(--primary-dark)">تفعيل</button>' +
    '</div>' : '';

  el.innerHTML =
    '<button class="back-btn" onclick="navigateTo(\'subject\',{subjectId:\'' + subjectId + '\'})"><i class="fa-solid fa-arrow-right"></i> رجوع للمادة</button>' +
    permBanner +
    '<div class="page-header">' +
      '<div class="page-header-left"><h1><i class="fa-solid ' + s.icon + '"></i> ' + escapeHtml(l.title) + '</h1>' +
      '<p>' + s.name + ' · ' + l.cards.length + ' بطاقة' + (l.date ? ' · ' + fmtDate(l.date) : '') + '</p></div>' +
      '<div class="page-header-actions">' +
        '<button class="btn btn-ghost btn-sm" onclick="toggleLessonFavorite(\'' + l.id + '\')"><i class="fa-solid fa-star" style="' + (l.favorite ? 'color:#F59E0B' : '') + '"></i> ' + (l.favorite ? 'مفضلة' : 'أضف للمفضلة') + '</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="openEditLessonModal(\'' + l.id + '\')"><i class="fa-solid fa-pen"></i> تعديل</button>' +
        '<button class="btn btn-danger btn-sm" onclick="deleteLesson(\'' + l.id + '\')"><i class="fa-solid fa-trash"></i> حذف</button>' +
      '</div>' +
    '</div>' +
    '<div class="section">' +
      '<h3><i class="fa-solid fa-signal"></i> حالة الدرس</h3>' +
      '<div class="status-btns">' +
        Object.keys(statusLabels).map(function(k){
          var v = statusLabels[k];
          return '<button class="status-btn ' + (l.status === k ? 'active' : '') + '" onclick="setLessonStatus(\'' + k + '\')"><i class="fa-solid ' + v.i + '"></i> ' + v.l + '</button>';
        }).join('') +
      '</div>' +
    '</div>' +
    '<div class="section">' +
      '<h3><i class="fa-solid fa-lightbulb"></i> نظام الفهم — تقنية فاينمان</h3>' +
      '<p style="font-size:13px;color:var(--muted);margin-bottom:12px;line-height:1.8">اشرح الدرس بكلماتك البسيطة، كأنك تدرّس طالباً لا يعرفه.</p>' +
      '<div class="feynman-area">' +
        '<div id="feynmanEditor">' + (l.feynman && l.feynman.text ? l.feynman.text : '') + '</div>' +
        '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;align-items:center">' +
          '<button class="btn btn-primary btn-sm" onclick="checkFeynman()"><i class="fa-solid fa-brain"></i> اختبر فهمي</button>' +
          '<button class="btn btn-ghost btn-sm" onclick="saveFeynman()"><i class="fa-solid fa-floppy-disk"></i> حفظ الشرح</button>' +
          '<button class="btn btn-ghost btn-sm" onclick="speakFeynman()"><i class="fa-solid fa-volume-high"></i> اسمع</button>' +
          (l.feynman && l.feynman.done ? '<span class="sched-item done"><i class="fa-solid fa-check"></i> تم الفهم</span>' : '') +
        '</div>' +
        '<div class="feynman-result" id="feynmanResult"></div>' +
      '</div>' +
    '</div>' +
    '<div class="section">' +
      '<h3><i class="fa-solid fa-layer-group"></i> بطاقات الحفظ (' + l.cards.length + ')</h3>' +
      '<div class="cards-list">' +
        (l.cards.length === 0 ? '<p style="color:var(--muted);font-size:13px;padding:16px 0">لا توجد بطاقات بعد. أضف بطاقتك الأولى.</p>' :
          l.cards.map(function(c){
            return '<div class="card-item"><span class="q">' + escapeHtml(c.q) + '</span>' +
              '<i class="fa-solid fa-volume-high speak" onclick="speakText(\'' + escapeHtml(c.q).replace(/'/g, "\\'") + '\')" title="اسمع"></i>' +
              '<span class="lvl lvl-' + c.level + '">' + ['','صعب','متوسط','سهل'][c.level] + '</span>' +
              '<i class="fa-solid fa-trash del" onclick="deleteCard(\'' + c.id + '\')"></i></div>';
          }).join('')) +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">' +
        '<button class="btn btn-ghost btn-sm" onclick="openCardModal()"><i class="fa-solid fa-plus"></i> إضافة بطاقة</button>' +
        (l.cards.length > 0 ? '<button class="btn btn-primary btn-sm" onclick="startFlashcards()"><i class="fa-solid fa-play"></i> مراجعة (' + due + ' مستحقة)</button>' : '') +
      '</div>' +
    '</div>' +
    '<div class="section">' +
      '<h3><i class="fa-solid fa-rotate"></i> التكرار المتباعد</h3>' +
      '<div class="sched">' + spacedHtml + '</div>' +
      (spaced.nextReview ? '<p style="font-size:12px;color:var(--primary);margin-top:12px"><i class="fa-solid fa-clock"></i> المراجعة القادمة: ' + fmtDate(spaced.nextReview) + '</p>' : '') +
      '<button class="btn btn-ghost btn-sm" style="margin-top:12px" onclick="markSpacedReview()"><i class="fa-solid fa-check"></i> أنجزت مراجعة هذه المرحلة</button>' +
    '</div>' +
    '<div class="section">' +
      '<h3><i class="fa-solid fa-robot"></i> مساعد الذكاء الاصطناعي</h3>' +
      '<p style="font-size:13px;color:var(--muted);margin-bottom:12px;line-height:1.8">خلّي AI يشرح لك الدرس بطريقة مبسطة مع أمثلة.</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">' +
        '<button class="btn btn-primary btn-sm" onclick="askAI(\'explain\')"><i class="fa-solid fa-lightbulb"></i> اشرح الدرس</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="askAI(\'examples\')"><i class="fa-solid fa-list"></i> أمثلة</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="askAI(\'quiz\')"><i class="fa-solid fa-question"></i> أسئلة</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="askAI(\'summary\')"><i class="fa-solid fa-compress"></i> ملخص</button>' +
      '</div>' +
      '<div id="aiResponse" style="display:none"></div>' +
    '</div>';
  initQuill();
}

async function setLessonStatus(status){
  var s = state.subjects.find(function(x){ return x.id === currentSubjectId; });
  if(!s) return;
  var l = s.lessons.find(function(x){ return x.id === currentLessonId; });
  if(!l) return;
  await sb.from('lessons').update({status: status}).eq('id', l.id);
  l.status = status;
  playSound('click');
  toast('تم تحديث الحالة', 'success');
  checkAchievements();
  navigateTo('lesson', {subjectId: currentSubjectId, lessonId: currentLessonId});
}

function initQuill(){
  var editorEl = document.getElementById('feynmanEditor');
  if(!editorEl) return;
  if(quillEditor) quillEditor = null;
  quillEditor = new Quill('#feynmanEditor', {
    theme: 'snow',
    placeholder: 'اشرح الدرس هنا بكلماتك...',
    modules: {toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{'header': [1, 2, 3, false]}],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      [{'color': []}, {'background': []}],
      ['blockquote', 'code-block'],
      ['link'],
      ['clean']
    ]}
  });
}

async function saveFeynman(){
  var s = state.subjects.find(function(x){ return x.id === currentSubjectId; });
  if(!s) return;
  var l = s.lessons.find(function(x){ return x.id === currentLessonId; });
  if(!l || !quillEditor) return;
  var txt = quillEditor.root.innerHTML;
  var plain = stripHtml(txt);
  if(plain.length < 5){ toast('اكتب شي أول', 'warning'); return; }
  await sb.from('lessons').update({feynman_text: txt}).eq('id', l.id);
  l.feynman = l.feynman || {done: false, text: ''};
  l.feynman.text = txt;
  playSound('success');
  toast('تم حفظ الشرح', 'success');
}

async function checkFeynman(){
  var s = state.subjects.find(function(x){ return x.id === currentSubjectId; });
  if(!s) return;
  var l = s.lessons.find(function(x){ return x.id === currentLessonId; });
  if(!l || !quillEditor) return;
  var html = quillEditor.root.innerHTML;
  var txt = stripHtml(html);
  var res = document.getElementById('feynmanResult');
  if(!res) return;
  if(txt.length < 30){
    res.className = 'feynman-result show bad';
    res.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> الشرح قصير جداً';
    playSound('error');
    return;
  }
  var words = txt.split(/\s+/).length;
  var hasExamples = /مثال|مثلا|مثل|يعني|كأن|تقريبا/.test(txt);
  var hasSimple = /بسيط|سهل|يعني|كأن|هو|هي/.test(txt);
  var hasFormatting = /<(b|strong|em|i|ul|ol|li|h[1-6])/i.test(html);
  var score = (words > 50 ? 1 : 0) + (hasExamples ? 1 : 0) + (hasSimple ? 1 : 0) + (hasFormatting ? 1 : 0);
  if(score >= 2){
    res.className = 'feynman-result show good';
    res.innerHTML = '<i class="fa-solid fa-circle-check"></i> ممتاز! شرحت بأسلوب مبسّط ومفصل';
    await sb.from('lessons').update({feynman_done: true, feynman_text: html}).eq('id', l.id);
    l.feynman = {done: true, text: html};
    if(l.status === 'new' || l.status === 'reading'){ l.status = 'reading'; await sb.from('lessons').update({status: 'reading'}).eq('id', l.id); }
    playSound('complete');
    celebrate();
    updateStreak();
    checkAchievements();
    pushNotif('study', 'أحسنت! فهمت درساً', l.title);
  } else {
    res.className = 'feynman-result show bad';
    res.innerHTML = '<i class="fa-solid fa-lightbulb"></i> حاول تبسّط أكثر، وأضف أمثلة';
    playSound('error');
  }
}

function speakFeynman(){
  if(!quillEditor) return;
  var txt = stripHtml(quillEditor.root.innerHTML);
  if(txt.length < 5){ toast('اكتب شي أول', 'warning'); return; }
  speakText(txt);
}

function speakText(text){
  if(!('speechSynthesis' in window)){ toast('المتصفح ما يدعم النطق', 'warning'); return; }
  var clean = stripHtml(text);
  window.speechSynthesis.cancel();
  var utter = new SpeechSynthesisUtterance(clean);
  utter.lang = 'ar-SA';
  utter.rate = 0.95;
  var voices = window.speechSynthesis.getVoices();
  var ar = voices.find(function(v){ return v.lang.indexOf('ar') === 0; });
  if(ar) utter.voice = ar;
  window.speechSynthesis.speak(utter);
}

/* ============ CARDS ============ */
function openCardModal(){
  document.getElementById('cardQInput').value = '';
  document.getElementById('cardAInput').value = '';
  openModal('cardModal');
  setTimeout(function(){ document.getElementById('cardQInput').focus(); }, 300);
}

async function saveCard(){
  var q = document.getElementById('cardQInput').value.trim();
  var a = document.getElementById('cardAInput').value.trim();
  if(!q || !a){ toast('املأ السؤال والجواب', 'warning'); return; }
  var s = state.subjects.find(function(x){ return x.id === currentSubjectId; });
  if(!s) return;
  var l = s.lessons.find(function(x){ return x.id === currentLessonId; });
  if(!l) return;
  var result = await sb.from('cards').insert({
    lesson_id: l.id, user_id: currentUser.id, q:q, a:a, level:2, box:1,
    next_review: new Date().toISOString()
  }).select().single();
  if(result.error){ toast('خطأ: ' + result.error.message, 'error'); return; }
  l.cards.push({id: result.data.id, q:q, a:a, level:2, box:1, nextReview: Date.now()});
  closeModal('cardModal');
  playSound('success');
  updateStreak();
  checkAchievements();
  pushNotif('memory', 'بطاقة حفظ جديدة', q);
  navigateTo('lesson', {subjectId: currentSubjectId, lessonId: currentLessonId});
}

async function deleteCard(cid){
  if(!confirm('حذف هذي البطاقة؟')) return;
  await sb.from('cards').delete().eq('id', cid);
  var s = state.subjects.find(function(x){ return x.id === currentSubjectId; });
  if(!s) return;
  var l = s.lessons.find(function(x){ return x.id === currentLessonId; });
  if(!l) return;
  l.cards = l.cards.filter(function(c){ return c.id !== cid; });
  playSound('click');
  toast('تم الحذف', 'success');
  navigateTo('lesson', {subjectId: currentSubjectId, lessonId: currentLessonId});
}

/* ============ FLASHCARDS ============ */
var fcQueue = [], fcIndex = 0, fcFlipped = false, fcOriginalLessonId = null;

function startFlashcards(){
  var s = state.subjects.find(function(x){ return x.id === currentSubjectId; });
  if(!s) return;
  var l = s.lessons.find(function(x){ return x.id === currentLessonId; });
  if(!l || l.cards.length === 0){ toast('لا توجد بطاقات', 'warning'); return; }
  fcOriginalLessonId = l.id;
  var now = Date.now();
  fcQueue = l.cards.filter(function(c){ return !c.nextReview || c.nextReview <= now; });
  if(fcQueue.length === 0) fcQueue = [].concat(l.cards);
  fcQueue.sort(function(){ return Math.random() - 0.5; });
  fcIndex = 0;
  fcFlipped = false;
  document.getElementById('fcOverlay').classList.add('show');
  renderFlashcard();
}

function renderFlashcard(){
  var box = document.getElementById('fcBox');
  var prog = document.getElementById('fcProgress');
  if(fcIndex >= fcQueue.length){
    box.innerHTML = '<div class="q">🎉 خلصت المراجعة!</div><div class="a">راجعت ' + fcQueue.length + ' بطاقة</div>';
    prog.textContent = '';
    playSound('complete');
    bigCelebrate();
    setTimeout(closeFlashcards, 1800);
    return;
  }
  var c = fcQueue[fcIndex];
  prog.textContent = 'بطاقة ' + (fcIndex + 1) + ' من ' + fcQueue.length;
  if(!fcFlipped){
    box.innerHTML = '<div class="q">' + escapeHtml(c.q) + '</div>' +
      '<div class="fc-actions">' +
      '<button class="btn btn-ghost" onclick="speakText(\'' + escapeHtml(c.q).replace(/'/g, "\\'") + '\')"><i class="fa-solid fa-volume-high"></i> اسمع</button>' +
      '<button class="btn btn-primary" onclick="flipCard()"><i class="fa-solid fa-eye"></i> اكشف الجواب</button>' +
      '</div>';
  } else {
    box.innerHTML = '<div class="q">' + escapeHtml(c.q) + '</div><div class="a">' + escapeHtml(c.a) + '</div>' +
      '<div class="fc-actions">' +
      '<button class="btn rate-1" onclick="rateCard(1)"><i class="fa-solid fa-face-tired"></i> صعب</button>' +
      '<button class="btn rate-2" onclick="rateCard(2)"><i class="fa-solid fa-face-meh"></i> متوسط</button>' +
      '<button class="btn rate-3" onclick="rateCard(3)"><i class="fa-solid fa-face-smile"></i> سهل</button>' +
      '</div>';
  }
}

function flipCard(){ fcFlipped = true; playSound('click'); renderFlashcard(); }

async function rateCard(level){
  var c = fcQueue[fcIndex];
  var s = state.subjects.find(function(x){ return x.id === currentSubjectId; });
  if(!s) return;
  var l = s.lessons.find(function(x){ return x.id === fcOriginalLessonId; });
  if(!l) return;
  var orig = l.cards.find(function(x){ return x.id === c.id; });
  if(orig){
    orig.level = level;
    var delays = {1: 10*60*1000, 2: 24*60*60*1000, 3: 4*24*60*60*1000};
    orig.nextReview = Date.now() + delays[level];
    await sb.from('cards').update({level: level, next_review: new Date(orig.nextReview).toISOString()}).eq('id', orig.id);
  }
  playSound('click');
  fcIndex++;
  fcFlipped = false;
  renderFlashcard();
}

function closeFlashcards(){
  document.getElementById('fcOverlay').classList.remove('show');
  fcQueue = [];
  fcIndex = 0;
  updateStreak();
  checkAchievements();
}

/* ============ SPACED ============ */
async function markSpacedReview(){
  var s = state.subjects.find(function(x){ return x.id === currentSubjectId; });
  if(!s) return;
  var l = s.lessons.find(function(x){ return x.id === currentLessonId; });
  if(!l) return;
  var idx = l.spaced.stage;
  if(idx >= SPACED_INTERVALS.length){ toast('أكملت كل المراجعات', 'success'); return; }
  l.spaced.history[idx] = Date.now();
  l.spaced.stage = idx + 1;
  var nextReview = null;
  var newStatus = l.status;
  if(idx + 1 < SPACED_INTERVALS.length){
    nextReview = new Date(Date.now() + SPACED_INTERVALS[idx + 1] * 24 * 60 * 60 * 1000).toISOString();
    l.spaced.nextReview = new Date(nextReview).getTime();
  } else {
    l.spaced.nextReview = null;
    l.status = 'memorized';
    newStatus = 'memorized';
  }
  await sb.from('lessons').update({
    spaced_stage: l.spaced.stage,
    spaced_history: l.spaced.history,
    spaced_next_review: nextReview,
    status: newStatus
  }).eq('id', l.id);
  playSound('complete');
  celebrate();
  toast('تم تسجيل المراجعة', 'success');
  updateStreak();
  checkAchievements();
  pushNotif('review', 'أنجزت مراجعة', l.title);
  navigateTo('lesson', {subjectId: currentSubjectId, lessonId: currentLessonId});
}

/* ============ STREAK ============ */
function getStreak(){ try{ return parseInt(localStorage.getItem('streak_count') || '0'); }catch(e){ return 0; } }

function updateStreak(){
  var today = new Date().toDateString();
  var lastStudy = localStorage.getItem('last_study_date');
  var streak = getStreak();
  if(lastStudy === today){ renderStreak(); return; }
  var yesterday = new Date(Date.now() - 86400000).toDateString();
  if(lastStudy === yesterday) streak++;
  else streak = 1;
  localStorage.setItem('streak_count', streak.toString());
  localStorage.setItem('last_study_date', today);
  renderStreak();
  if(streak > 1) toast('🔥 ' + streak + ' أيام متتالية!', 'success');
}

function renderStreak(){
  var el = document.getElementById('streakCount');
  if(el) el.textContent = getStreak();
}

/* ============ NOTIFICATIONS ============ */
function requestNotifPermission(){
  if(!('Notification' in window)) return;
  if(Notification.permission === 'default') Notification.requestPermission();
}

async function pushNotif(type, title, body){
  if(!currentUser) return;
  var result = await sb.from('notifications').insert({user_id: currentUser.id, type:type, title:title, body:body, read:false}).select().single();
  if(result.data){
    state.notifications.unshift({id: result.data.id, type:type, title:title, body:body, time:new Date(result.data.created_at).getTime(), read:false});
    renderNotifBadge();
    renderNotifList();
  }
  if('Notification' in window && Notification.permission === 'granted'){
    try{ var n = new Notification(title, {body: body}); setTimeout(function(){ n.close(); }, 6000); }catch(e){}
  }
  toast(title + ' — ' + body, 'info');
}

function renderNotifBadge(){
  var unread = (state.notifications || []).filter(function(n){ return !n.read; }).length;
  var badge = document.getElementById('notifBadge');
  if(!badge) return;
  if(unread > 0){ badge.textContent = unread > 99 ? '99+' : unread; badge.classList.remove('hidden'); }
  else badge.classList.add('hidden');
}

function renderNotifList(){
  var list = document.getElementById('notifList');
  if(!list) return;
  var notifs = state.notifications || [];
  if(notifs.length === 0){ list.innerHTML = '<div class="notif-empty"><i class="fa-solid fa-bell-slash"></i><p>لا إشعارات بعد</p></div>'; return; }
  list.innerHTML = notifs.slice(0, 30).map(function(n){
    var icon = n.type === 'exam' ? 'fa-file-pen' : n.type === 'review' ? 'fa-rotate' : n.type === 'memory' ? 'fa-brain' : n.type === 'challenge' ? 'fa-bullseye' : n.type === 'study' ? 'fa-lightbulb' : 'fa-bell';
    return '<div class="notif-item ' + (n.read ? 'read' : 'unread') + '" data-type="' + n.type + '" onclick="markNotifRead(\'' + n.id + '\')">' +
      '<div class="notif-icon"><i class="fa-solid ' + icon + '"></i></div>' +
      '<div class="notif-content">' +
        '<div class="notif-title">' + escapeHtml(n.title) + '</div>' +
        '<div class="notif-body">' + escapeHtml(n.body) + '</div>' +
        '<div class="notif-time"><i class="fa-regular fa-clock"></i> ' + timeAgo(n.time) + '</div>' +
      '</div></div>';
  }).join('');
}

async function markNotifRead(id){
  await sb.from('notifications').update({read: true}).eq('id', id);
  var n = state.notifications.find(function(x){ return x.id === id; });
  if(n) n.read = true;
  renderNotifBadge();
  renderNotifList();
}

async function markAllNotifsRead(){
  await sb.from('notifications').update({read: true}).eq('user_id', currentUser.id);
  state.notifications.forEach(function(n){ n.read = true; });
  renderNotifBadge();
  renderNotifList();
  toast('تم تحديد الكل كمقروء', 'success');
}

async function clearAllNotifs(){
  if(!confirm('مسح كل الإشعارات؟')) return;
  await sb.from('notifications').delete().eq('user_id', currentUser.id);
  state.notifications = [];
  renderNotifBadge();
  renderNotifList();
  toast('تم المسح', 'success');
}

/* ============ AI ============ */
var AI_WORKER_URL = 'https://studymate-ai.dzdiscord8231.workers.dev';

async function askAI(action){
  var s = state.subjects.find(function(x){ return x.id === currentSubjectId; });
  if(!s) return;
  var l = s.lessons.find(function(x){ return x.id === currentLessonId; });
  if(!l) return;
  var prompts = {
    explain: 'اشرح لي درس "' + l.title + '" في مادة ' + s.name + ' بطريقة بسيطة جداً، كأنك تشرح لطالب في المتوسط. أضف أمثلة من الحياة اليومية.',
    examples: 'أعطني 3 أمثلة عملية على درس "' + l.title + '" في مادة ' + s.name + '.',
    quiz: 'اقترح 5 أسئلة قصيرة لاختبار فهمي لدرس "' + l.title + '" في مادة ' + s.name + '، وأعطني الأجوبة بعدها.',
    summary: 'لخّص لي درس "' + l.title + '" في مادة ' + s.name + ' في 5 نقاط رئيسية.'
  };
  var prompt = prompts[action] || prompts.explain;
  var cacheKey = currentSubjectId + '_' + currentLessonId + '_' + action;
  var responseEl = document.getElementById('aiResponse');
  if(!responseEl) return;
  responseEl.style.display = 'block';
  if(state.aiCache[cacheKey]){
    responseEl.innerHTML = '<div style="color:var(--primary);font-weight:700;margin-bottom:8px"><i class="fa-solid fa-robot"></i> AI:</div>' + formatAIText(state.aiCache[cacheKey]);
    return;
  }
  responseEl.innerHTML = '<div style="text-align:center;padding:20px"><div class="spinner" style="margin:0 auto"></div><div style="color:var(--muted);margin-top:8px;font-size:13px">جاري التفكير...</div></div>';
  try{
    var res = await fetch(AI_WORKER_URL, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({prompt: prompt})});
    var data = await res.json();
    if(data.error){ responseEl.innerHTML = '<div style="color:var(--red)"><i class="fa-solid fa-triangle-exclamation"></i> خطأ: ' + escapeHtml(data.error) + '</div>'; playSound('error'); return; }
    if(!data.reply){ responseEl.innerHTML = '<div style="color:var(--muted)">ما وصل رد من AI.</div>'; return; }
    state.aiCache[cacheKey] = data.reply;
    localStorage.setItem('ai_cache', JSON.stringify(state.aiCache));
    responseEl.innerHTML = '<div style="color:var(--primary);font-weight:700;margin-bottom:8px"><i class="fa-solid fa-robot"></i> AI:</div>' + formatAIText(data.reply);
    playSound('success');
    celebrate();
  }catch(err){
    responseEl.innerHTML = '<div style="color:var(--red)"><i class="fa-solid fa-triangle-exclamation"></i> تعذر الاتصال بالخادم</div>';
    playSound('error');
  }
}

function formatAIText(text){
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n\n/g, '</p><p style="margin-top:10px">').replace(/\n/g, '<br>').replace(/^(.+)$/, '<p>$1</p>');
}

/* ============ TOOLS ============ */
function openTool(tool){
  if(tool === 'calculator') openCalculator();
  else if(tool === 'grades') openGradesCalculator();
  else if(tool === 'pomodoro') openPomodoro();
  else if(tool === 'search') openSearchModal();
}

function openSystem(sys){
  if(sys === 'leitner') openLeitnerSystem();
  else if(sys === 'concepts') openConceptsSystem();
  else if(sys === 'memory-palace') openMemoryPalace();
}

/* Search */
function openSearchModal(){
  var existing = document.getElementById('searchOverlay');
  if(existing) existing.remove();
  var overlay = document.createElement('div');
  overlay.id = 'searchOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);backdrop-filter:blur(8px);z-index:250;display:flex;align-items:flex-start;justify-content:center;padding:80px 20px 20px;animation:fadeIn .2s';
  overlay.onclick = function(e){ if(e.target === overlay) overlay.remove(); };
  overlay.innerHTML = '<div style="background:var(--bg-1);border:1px solid var(--border);border-radius:16px;width:100%;max-width:600px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.6)">' +
    '<div style="display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid var(--border);position:relative">' +
      '<i class="fa-solid fa-magnifying-glass" style="color:var(--primary);font-size:18px"></i>' +
      '<input type="text" id="searchQuickInput" placeholder="ابحث..." style="flex:1;background:none;border:none;color:var(--text);font-size:16px;font-family:var(--font);outline:none;padding-left:40px" autofocus>' +
      '<button onclick="startVoiceSearch()" id="voiceBtn" style="position:absolute;left:36px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;padding:4px;z-index:5"><i class="fa-solid fa-microphone"></i></button>' +
      '<button onclick="document.getElementById(\'searchOverlay\').remove()" style="background:var(--surface);border:1px solid var(--border);color:var(--muted);width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:14px"><i class="fa-solid fa-xmark"></i></button>' +
    '</div>' +
    '<div id="searchResults" style="max-height:500px;overflow-y:auto;padding:8px"></div></div>';
  document.body.appendChild(overlay);
  var input = document.getElementById('searchQuickInput');
  input.addEventListener('input', function(){ performSearch(this.value); });
  performSearch('');
}

function performSearch(query){
  var results = document.getElementById('searchResults');
  if(!results) return;
  query = query.trim().toLowerCase();
  if(!query){ results.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted);font-size:13px">اكتب للبحث</div>'; return; }
  var matches = [];
  state.subjects.forEach(function(s){
    if(s.name.toLowerCase().indexOf(query) !== -1){
      matches.push({type:'subject', title:s.name, sub:s.lessons.length + ' درس', icon:s.icon, color:s.color, subjectId:s.id});
    }
    s.lessons.forEach(function(l){
      if(l.title.toLowerCase().indexOf(query) !== -1){
        matches.push({type:'lesson', title:l.title, sub:s.name, icon:'fa-file-lines', color:s.color, subjectId:s.id, lessonId:l.id});
      }
      l.cards.forEach(function(c){
        if(c.q.toLowerCase().indexOf(query) !== -1 || c.a.toLowerCase().indexOf(query) !== -1){
          matches.push({type:'card', title:c.q.length > 60 ? c.q.substring(0, 60) + '...' : c.q, sub:s.name + ' · ' + l.title, icon:'fa-layer-group', color:s.color, subjectId:s.id, lessonId:l.id});
        }
      });
    });
  });
  if(matches.length === 0){ results.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted);font-size:13px">لا نتائج</div>'; return; }
  var typeLabels = {subject:'مادة', lesson:'درس', card:'بطاقة'};
  results.innerHTML = matches.slice(0, 30).map(function(m){
    var onclick = m.type === 'subject' ? 'closeSearch();openSubject(\'' + m.subjectId + '\')' : 'closeSearch();openLessonFromSearch(\'' + m.subjectId + '\',\'' + m.lessonId + '\')';
    return '<div onclick="' + onclick + '" style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:10px;cursor:pointer;margin-bottom:2px" onmouseover="this.style.background=\'var(--surface)\'" onmouseout="this.style.background=\'transparent\'">' +
      '<div style="width:38px;height:38px;border-radius:10px;background:' + (m.color || 'var(--primary)') + '1a;color:' + (m.color || 'var(--primary)') + ';display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0"><i class="fa-solid ' + m.icon + '"></i></div>' +
      '<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:14px;margin-bottom:2px">' + escapeHtml(m.title) + '</div>' +
      '<div style="font-size:12px;color:var(--muted)"><span style="padding:1px 6px;border-radius:6px;background:var(--surface);font-size:10px;font-weight:600">' + typeLabels[m.type] + '</span> ' + escapeHtml(m.sub) + '</div></div>' +
      '<i class="fa-solid fa-chevron-left" style="color:var(--muted);font-size:12px"></i></div>';
  }).join('');
}
function closeSearch(){ var o = document.getElementById('searchOverlay'); if(o) o.remove(); }
function openLessonFromSearch(subjectId, lessonId){ closeSearch(); currentSubjectId = subjectId; currentLessonId = lessonId; navigateTo('lesson', {subjectId:subjectId, lessonId:lessonId}); }

function startVoiceSearch(){
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ toast('⚠️ المتصفح ما يدعم البحث الصوتي', 'warning'); return; }
  var r = new SR();
  r.lang = 'ar-DZ';
  r.continuous = false;
  r.interimResults = false;
  var btn = document.getElementById('voiceBtn');
  if(btn) btn.innerHTML = '<i class="fa-solid fa-microphone fa-beat" style="color:var(--red)"></i>';
  toast('🎤 تكلم الآن...', 'info');
  r.onresult = function(e){
    var text = e.results[0][0].transcript;
    var input = document.getElementById('searchQuickInput');
    if(input){ input.value = text; performSearch(text); }
    toast('🔍 بحثت عن: ' + text, 'success');
  };
  r.onerror = function(){ toast('⚠️ ما سمعتك', 'error'); };
  r.onend = function(){ if(btn) btn.innerHTML = '<i class="fa-solid fa-microphone"></i>'; };
  r.start();
}

/* Calculator */
var calcExpression = '';
var calcHistoryList = [];

function openCalculator(){
  var overlay = document.getElementById('calcOverlay');
  if(!overlay) return;
  var c = document.getElementById('calcContainer');
  c.innerHTML = '<div style="background:var(--bg-1);border:1px solid var(--border);border-radius:20px;padding:20px">' +
    '<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:14px;text-align:left;direction:ltr">' +
      '<div id="calcExpr" style="font-size:14px;color:var(--muted);min-height:20px;font-family:Courier New,monospace"></div>' +
      '<div id="calcResult" style="font-size:32px;font-weight:900;color:var(--primary);font-family:Courier New,monospace;margin-top:6px">0</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">' +
      calcBtn('sin', "calcInput('Math.sin(')", 'fn') + calcBtn('cos', "calcInput('Math.cos(')", 'fn') + calcBtn('tan', "calcInput('Math.tan(')", 'fn') + calcBtn('π', "calcInput('Math.PI')", 'fn') + calcBtn('e', "calcInput('Math.E')", 'fn') +
      calcBtn('log', "calcInput('Math.log10(')", 'fn') + calcBtn('ln', "calcInput('Math.log(')", 'fn') + calcBtn('√', "calcInput('Math.sqrt(')", 'fn') + calcBtn('x²', "calcInput('**2')", 'fn') + calcBtn('^', "calcInput('**')", 'fn') +
      calcBtn('C', "calcClear()", 'clear') + calcBtn('(', "calcInput('(')", 'op') + calcBtn(')', "calcInput(')')", 'op') + calcBtn('%', "calcInput('%')", 'op') + calcBtn('÷', "calcInput('/')", 'op') +
      calcBtn('7', "calcInput('7')", '') + calcBtn('8', "calcInput('8')", '') + calcBtn('9', "calcInput('9')", '') + calcBtn('⌫', "calcBack()", 'clear') + calcBtn('×', "calcInput('*')", 'op') +
      calcBtn('4', "calcInput('4')", '') + calcBtn('5', "calcInput('5')", '') + calcBtn('6', "calcInput('6')", '') + calcBtn('−', "calcInput('-')", 'op') + calcBtn('1/x', "calcInput('1/')", 'fn') +
      calcBtn('1', "calcInput('1')", '') + calcBtn('2', "calcInput('2')", '') + calcBtn('3', "calcInput('3')", '') + calcBtn('+', "calcInput('+')", 'op') + calcBtn('=', "calcEquals()", 'eq') +
      calcBtn('±', "calcInput('-')", 'op') + calcBtn('0', "calcInput('0')", '') + calcBtn('.', "calcInput('.')", '') + calcBtn('|x|', "calcInput('Math.abs(')", 'fn') + calcBtn('⌊x⌋', "calcInput('Math.floor(')", 'fn') +
    '</div>' +
    '<div style="margin-top:16px;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px">' +
      '<h4 style="font-size:13px;color:var(--primary);margin-bottom:10px"><i class="fa-solid fa-clock-rotate-left"></i> آخر النتائج</h4>' +
      '<div id="calcHistory"><p style="color:var(--muted);font-size:12px;text-align:center;padding:10px">لا نتائج بعد</p></div>' +
    '</div></div>';
  overlay.classList.add('show');
  updateCalcDisplay();
  renderCalcHistory();
}

function calcBtn(label, action, type){
  var bg = 'var(--surface)', color = 'var(--text)';
  if(type === 'op'){ bg = 'var(--primary-soft)'; color = 'var(--primary)'; }
  else if(type === 'eq'){ bg = 'linear-gradient(135deg,var(--primary),var(--primary-dark))'; color = '#fff'; }
  else if(type === 'fn'){ bg = 'rgba(139,92,246,.15)'; color = '#8B5CF6'; }
  else if(type === 'clear'){ bg = 'rgba(239,68,68,.15)'; color = 'var(--red)'; }
  return '<button onclick="' + action + '" style="padding:14px 6px;border-radius:10px;border:1px solid var(--border);background:' + bg + ';color:' + color + ';cursor:pointer;font-size:14px;font-weight:700;font-family:var(--font)">' + label + '</button>';
}

function closeCalculator(){ var o = document.getElementById('calcOverlay'); if(o) o.classList.remove('show'); }
function calcInput(v){ calcExpression += v; updateCalcDisplay(); playSound('click'); }
function calcClear(){ calcExpression = ''; updateCalcDisplay(); playSound('click'); }
function calcBack(){ calcExpression = calcExpression.slice(0, -1); updateCalcDisplay(); playSound('click'); }

function updateCalcDisplay(){
  var e = document.getElementById('calcExpr');
  var r = document.getElementById('calcResult');
  if(!e || !r) return;
  e.textContent = calcExpression || '';
  if(!calcExpression){ r.textContent = '0'; return; }
  try{
    var res = Function('"use strict"; return (' + calcExpression + ')')();
    if(typeof res === 'number' && !isNaN(res) && isFinite(res)) r.textContent = formatNumber(res);
    else r.textContent = '...';
  }catch(err){ r.textContent = '...'; }
}

function calcEquals(){
  if(!calcExpression) return;
  try{
    var res = Function('"use strict"; return (' + calcExpression + ')')();
    if(typeof res === 'number' && !isNaN(res) && isFinite(res)){
      var f = formatNumber(res);
      addCalcHistory(calcExpression, f);
      calcExpression = String(res);
      updateCalcDisplay();
      playSound('success');
    } else { toast('عملية غير صحيحة', 'error'); playSound('error'); }
  }catch(e){ toast('عملية غير صحيحة', 'error'); playSound('error'); }
}

function formatNumber(n){
  if(Math.abs(n) < 0.0001 && n !== 0) return n.toExponential(4);
  if(Math.abs(n) > 1e10) return n.toExponential(4);
  return parseFloat(n.toFixed(8)).toString();
}

function addCalcHistory(expr, result){
  calcHistoryList.unshift({expr:expr, result:result, time:Date.now()});
  if(calcHistoryList.length > 10) calcHistoryList = calcHistoryList.slice(0, 10);
  renderCalcHistory();
}

function renderCalcHistory(){
  var el = document.getElementById('calcHistory');
  if(!el) return;
  if(calcHistoryList.length === 0){ el.innerHTML = '<p style="color:var(--muted);font-size:12px;text-align:center;padding:10px">لا نتائج بعد</p>'; return; }
  el.innerHTML = calcHistoryList.map(function(h){
    return '<div style="padding:10px 12px;background:var(--bg);border-radius:10px;margin-bottom:6px;display:flex;justify-content:space-between;cursor:pointer" onclick="calcExpression=\'' + h.result + '\';updateCalcDisplay();">' +
      '<div style="font-size:12px;color:var(--muted);font-family:Courier New,monospace;direction:ltr">' + escapeHtml(h.expr) + '</div>' +
      '<div style="font-weight:800;color:var(--primary);font-family:Courier New,monospace;font-size:14px;direction:ltr">= ' + h.result + '</div></div>';
  }).join('');
}

/* Grades */
var currentSemester = '1';

function openGradesCalculator(){
  var overlay = document.getElementById('calcOverlay');
  if(!overlay) return;
  var c = document.getElementById('calcContainer');
  renderGradesUI(c);
  overlay.classList.add('show');
}

function renderGradesUI(container){
  var sg = state.grades.filter(function(g){ return g.semester === currentSemester; });
  var avg = calculateAverage(sg);
  container.innerHTML = '<div style="background:var(--bg-1);border:1px solid var(--border);border-radius:20px;padding:20px">' +
    '<h2 style="color:var(--primary);font-weight:800;margin-bottom:16px;text-align:center;font-size:20px"><i class="fa-solid fa-calculator"></i> حاسبة المعدل</h2>' +
    '<div style="display:flex;gap:8px;margin-bottom:16px;justify-content:center">' +
      ['1','2','3'].map(function(s){ return '<button class="status-btn ' + (currentSemester === s ? 'active' : '') + '" onclick="switchSemester(\'' + s + '\')" style="padding:10px 18px">الفصل ' + s + '</button>'; }).join('') +
    '</div>' +
    (sg.length > 0 ? '<div style="background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:#fff;text-align:center;padding:22px;border-radius:14px;margin-bottom:16px"><div style="font-size:13px;opacity:.9;margin-bottom:6px">المعدل الفصلي</div><div style="font-size:52px;font-weight:900;line-height:1">' + avg.toFixed(2) + '</div><div style="font-size:16px;font-weight:700;margin-top:8px">' + getGradeLabel(avg) + '</div><div style="font-size:11px;opacity:.8;margin-top:6px">' + sg.length + ' مادة</div></div>' : '') +
    '<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:12px">' +
      '<h4 style="font-size:13px;color:var(--primary);margin-bottom:12px"><i class="fa-solid fa-plus"></i> إضافة مادة</h4>' +
      '<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:6px;margin-bottom:10px">' +
        '<input id="gradeSubjectInput" list="gradeSubjectList" placeholder="المادة" style="padding:10px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:var(--font);font-size:13px">' +
        '<input id="gradeValueInput" type="number" min="0" max="20" step="0.25" placeholder="العلامة" style="padding:10px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:var(--font);font-size:13px">' +
        '<input id="gradeCoefInput" type="number" min="1" max="10" value="1" placeholder="المعامل" style="padding:10px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:var(--font);font-size:13px">' +
      '</div>' +
      '<datalist id="gradeSubjectList">' + BEM_SUBJECTS.map(function(s){ return '<option value="' + s + '">'; }).join('') + '</datalist>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<button class="btn btn-primary btn-sm" onclick="addGrade()"><i class="fa-solid fa-check"></i> إضافة</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="quickFillGrades()"><i class="fa-solid fa-wand-magic-sparkles"></i> ملء سريع</button>' +
      '</div>' +
    '</div>' +
    (sg.length > 0 ? '<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px;max-height:300px;overflow-y:auto">' +
      '<h4 style="font-size:13px;color:var(--primary);margin-bottom:12px">المواد (' + sg.length + ')</h4>' +
      sg.map(function(g){
        return '<div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg);border-radius:10px;margin-bottom:6px;font-size:13px">' +
          '<span style="flex:1;font-weight:600">' + escapeHtml(g.subject_name) + '</span>' +
          '<span style="color:var(--primary);font-weight:800">' + g.grade + '/20</span>' +
          '<span style="font-size:11px;padding:2px 8px;border-radius:10px;background:var(--primary-soft);color:var(--primary)">×' + g.coefficient + '</span>' +
          '<i class="fa-solid fa-trash" style="color:var(--red);cursor:pointer;opacity:.5;font-size:12px" onclick="delGrade(\'' + g.id + '\')"></i></div>';
      }).join('') + '</div>' : '') +
    '<button class="btn btn-ghost btn-sm" style="width:100%;margin-top:12px;justify-content:center" onclick="closeCalculator()"><i class="fa-solid fa-xmark"></i> إغلاق</button></div>';
}

function switchSemester(s){ currentSemester = s; var c = document.getElementById('calcContainer'); renderGradesUI(c); }
function calculateAverage(g){ if(g.length === 0) return 0; var t = 0, c = 0; g.forEach(function(x){ t += parseFloat(x.grade) * parseFloat(x.coefficient); c += parseFloat(x.coefficient); }); return c > 0 ? t/c : 0; }
function getGradeLabel(a){ if(a >= 18) return '🏆 ممتاز'; if(a >= 16) return '⭐ جيد جداً'; if(a >= 14) return '👍 جيد'; if(a >= 12) return '✅ مقبول'; if(a >= 10) return '⚠️ ضعيف'; return '❌ راسب'; }

async function addGrade(){
  var subject = document.getElementById('gradeSubjectInput').value.trim();
  var grade = parseFloat(document.getElementById('gradeValueInput').value);
  var coef = parseFloat(document.getElementById('gradeCoefInput').value) || 1;
  if(!subject){ toast('اكتب اسم المادة', 'warning'); return; }
  if(isNaN(grade) || grade < 0 || grade > 20){ toast('العلامة من 0 إلى 20', 'warning'); return; }
  var r = await sb.from('grades').insert({user_id:currentUser.id, semester:currentSemester, subject_name:subject, grade:grade, coefficient:coef}).select().single();
  if(r.error){ toast('خطأ: ' + r.error.message, 'error'); return; }
  state.grades.push(r.data);
  playSound('success');
  celebrate();
  var c = document.getElementById('calcContainer');
  renderGradesUI(c);
  toast('تمت الإضافة', 'success');
  checkAchievements();
}

async function delGrade(id){
  if(!confirm('حذف؟')) return;
  await sb.from('grades').delete().eq('id', id);
  state.grades = state.grades.filter(function(g){ return g.id !== id; });
  playSound('click');
  var c = document.getElementById('calcContainer');
  renderGradesUI(c);
}

async function quickFillGrades(){
  if(!confirm('إضافة كل مواد BEM؟')) return;
  var existing = state.grades.filter(function(g){ return g.semester === currentSemester; }).map(function(g){ return g.subject_name; });
  var toAdd = BEM_SUBJECTS.filter(function(s){ return existing.indexOf(s) === -1; });
  if(toAdd.length === 0){ toast('كل المواد مضافة', 'info'); return; }
  var inserts = toAdd.map(function(s){ return {user_id:currentUser.id, semester:currentSemester, subject_name:s, grade:0, coefficient:1}; });
  var r = await sb.from('grades').insert(inserts).select();
  if(r.error){ toast('خطأ: ' + r.error.message, 'error'); return; }
  state.grades = state.grades.concat(r.data);
  playSound('success');
  celebrate();
  var c = document.getElementById('calcContainer');
  renderGradesUI(c);
}

/* Pomodoro */
var pomoInterval = null, pomoTime = 25*60, pomoRunning = false, pomoPhase = 'focus';

function openPomodoro(){ document.getElementById('pomoOverlay').classList.add('show'); updatePomoDisplay(); }
function closePomodoro(){ document.getElementById('pomoOverlay').classList.remove('show'); if(pomoInterval){ clearInterval(pomoInterval); pomoInterval = null; pomoRunning = false; } }

function updatePomoDisplay(){
  var m = Math.floor(pomoTime/60).toString().padStart(2,'0');
  var s = (pomoTime%60).toString().padStart(2,'0');
  var t = document.getElementById('pomoTime'), p = document.getElementById('pomoPhase'), b = document.getElementById('pomoStartBtn');
  if(t) t.textContent = m + ':' + s;
  if(p) p.textContent = pomoPhase === 'focus' ? 'جلسة تركيز' : 'راحة';
  if(b) b.innerHTML = pomoRunning ? '<i class="fa-solid fa-pause"></i> إيقاف' : '<i class="fa-solid fa-play"></i> ابدأ';
}

function togglePomo(){
  if(pomoRunning){ clearInterval(pomoInterval); pomoInterval = null; pomoRunning = false; }
  else{
    pomoRunning = true;
    pomoInterval = setInterval(function(){
      pomoTime--;
      if(pomoTime <= 0){
        clearInterval(pomoInterval); pomoInterval = null; pomoRunning = false;
        if(pomoPhase === 'focus'){ localStorage.setItem('pomodoro_done', 'true'); pomoPhase = 'break'; pomoTime = 5*60; playSound('complete'); bigCelebrate(); pushNotif('info', 'خلصت الجلسة!', 'خذ راحة 5 دقائق'); addXP(15); checkAchievements(); }
        else{ pomoPhase = 'focus'; pomoTime = 25*60; playSound('complete'); pushNotif('info', 'خلصت الراحة!', 'ابدأ جلسة جديدة'); }
      }
      updatePomoDisplay();
    }, 1000);
  }
  playSound('click');
  updatePomoDisplay();
}

function resetPomo(){ clearInterval(pomoInterval); pomoInterval = null; pomoRunning = false; pomoPhase = 'focus'; pomoTime = 25*60; updatePomoDisplay(); playSound('click'); }

/* ============ CALENDAR ============ */
function renderCalendarPage(el){
  var now = Date.now();
  var up = [];
  state.subjects.forEach(function(s){
    s.lessons.forEach(function(l){
      if(l.spaced && l.spaced.nextReview && l.spaced.nextReview > now){
        up.push({type:'review', title:'مراجعة: ' + l.title, date:l.spaced.nextReview, subj:s.name, icon:s.icon, color:s.color, subjectId:s.id, lessonId:l.id});
      }
    });
  });
  state.exams.forEach(function(exam){
    var ed = new Date(exam.exam_date).getTime();
    if(ed >= now - 86400000){ up.push({type:'exam', title:'📝 ' + exam.title, date:ed, subj:(exam.subject || 'امتحان') + (exam.exam_time ? ' · ' + exam.exam_time : ''), icon:'fa-file-pen', color:'#EF4444'}); }
  });
  up.sort(function(a,b){ return a.date - b.date; });
  el.innerHTML =
    '<div class="page-header"><div class="page-header-left"><h1><i class="fa-solid fa-calendar-days"></i> التقويم</h1><p>المواعيد القادمة والمراجعات</p></div>' +
    '<div class="page-header-actions"><button class="btn btn-ghost" onclick="navigateTo(\'monthly\')"><i class="fa-solid fa-calendar"></i> الشهري</button>' +
    '<button class="btn btn-primary" onclick="openScheduleModal()"><i class="fa-solid fa-plus"></i> موعد</button></div></div>' +
    (up.length === 0 ? '<div class="empty-state"><div class="empty-state-icon"><i class="fa-solid fa-calendar-xmark"></i></div><h2>لا مواعيد</h2></div>' :
      '<div class="section"><h3><i class="fa-solid fa-clock"></i> المواعيد (' + up.length + ')</h3>' +
        up.map(function(u){
          return '<div class="lesson-card" style="--status-color:' + (u.color || '#FF7A00') + ';margin-bottom:8px" ' + (u.lessonId ? 'onclick="openLesson(\'' + u.lessonId + '\')"' : '') + '>' +
            '<div class="lesson-status" style="background:' + (u.color || '#FF7A00') + '"></div>' +
            '<div class="lesson-content"><div class="lesson-title">' + escapeHtml(u.title) + '</div>' +
            '<div class="lesson-meta"><span><i class="fa-solid fa-book"></i> ' + escapeHtml(u.subj) + '</span><span><i class="fa-regular fa-calendar"></i> ' + fmtDate(u.date) + '</span></div></div>' +
            '<i class="fa-solid fa-chevron-left lesson-chev"></i></div>';
        }).join('') + '</div>');
}

function openScheduleModal(){
  document.getElementById('schedTitleInput').value = '';
  document.getElementById('schedTimeInput').value = '';
  openModal('scheduleModal');
}

async function saveSchedule(){
  var type = document.getElementById('schedTypeInput').value;
  var day = document.getElementById('schedDayInput').value;
  var title = document.getElementById('schedTitleInput').value.trim();
  var time = document.getElementById('schedTimeInput').value.trim();
  if(!title){ toast('اكتب العنوان', 'warning'); return; }
  var r = await sb.from('schedule').insert({user_id:currentUser.id, type:type, day:day, title:title, time:time}).select().single();
  if(r.error){ toast('خطأ', 'error'); return; }
  state.schedule.push(r.data);
  closeModal('scheduleModal');
  playSound('success');
  toast('تمت الإضافة', 'success');
  checkAchievements();
  navigateTo('calendar');
}

/* Monthly */
var currentMonthlyDate = new Date();

function renderMonthlyPage(el){
  var year = currentMonthlyDate.getFullYear();
  var month = currentMonthlyDate.getMonth();
  var monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  var firstDay = new Date(year, month, 1);
  var lastDay = new Date(year, month + 1, 0);
  var daysInMonth = lastDay.getDate();
  var startDay = (firstDay.getDay() + 1) % 7;
  var today = new Date();
  var isCur = (today.getFullYear() === year && today.getMonth() === month);
  var eventsByDay = {};
  state.subjects.forEach(function(s){
    s.lessons.forEach(function(l){
      if(l.spaced && l.spaced.nextReview){
        var d = new Date(l.spaced.nextReview);
        if(d.getFullYear() === year && d.getMonth() === month){ var k = d.getDate(); if(!eventsByDay[k]) eventsByDay[k] = []; eventsByDay[k].push({type:'review', title:l.title, lessonId:l.id}); }
      }
    });
  });
  state.exams.forEach(function(exam){
    var d = new Date(exam.exam_date);
    if(d.getFullYear() === year && d.getMonth() === month){ var k = d.getDate(); if(!eventsByDay[k]) eventsByDay[k] = []; eventsByDay[k].push({type:'exam', title:exam.title}); }
  });
  var daysHtml = '';
  for(var i = 0; i < startDay; i++) daysHtml += '<div class="day-cell other-month"></div>';
  for(var d = 1; d <= daysInMonth; d++){
    var isToday = isCur && today.getDate() === d;
    var ev = eventsByDay[d] || [];
    var dots = ev.slice(0,4).map(function(e){ return '<span class="' + e.type + '"></span>'; }).join('');
    daysHtml += '<div class="day-cell ' + (isToday ? 'today' : '') + '" onclick="showDayEvents(' + d + ',' + month + ',' + year + ')"><div class="num">' + d + '</div>' + (dots ? '<div class="dots">' + dots + '</div>' : '') + '</div>';
  }
  var headers = ['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
  el.innerHTML = '<div class="page-header"><div class="page-header-left"><h1><i class="fa-solid fa-calendar"></i> ' + monthNames[month] + ' ' + year + '</h1></div></div>' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:18px;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px">' +
    '<button class="btn btn-ghost btn-sm" onclick="changeMonth(-1)"><i class="fa-solid fa-chevron-right"></i></button>' +
    '<h2 style="color:var(--primary);font-weight:800;font-size:18px">' + monthNames[month] + '</h2>' +
    '<button class="btn btn-ghost btn-sm" onclick="changeMonth(1)"><i class="fa-solid fa-chevron-left"></i></button></div>' +
    '<div class="monthly-cal">' + headers.map(function(h){ return '<div class="day-header">' + h + '</div>'; }).join('') + daysHtml + '</div>' +
    '<div style="text-align:center;margin-top:20px"><button class="btn btn-ghost btn-sm" onclick="goToToday()"><i class="fa-solid fa-calendar-day"></i> اليوم</button></div>';
}

function changeMonth(d){ currentMonthlyDate.setMonth(currentMonthlyDate.getMonth() + d); navigateTo('monthly'); }
function goToToday(){ currentMonthlyDate = new Date(); navigateTo('monthly'); }

function showDayEvents(day, month, year){
  var events = [];
  state.subjects.forEach(function(s){ s.lessons.forEach(function(l){ if(l.spaced && l.spaced.nextReview){ var d = new Date(l.spaced.nextReview); if(d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) events.push({type:'review', title:'مراجعة: ' + l.title, subj:s.name, lessonId:l.id}); } }); });
  state.exams.forEach(function(exam){ var d = new Date(exam.exam_date); if(d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) events.push({type:'exam', title:'📝 ' + exam.title, subj:exam.subject || 'امتحان'}); });
  if(events.length === 0){ toast('لا مواعيد', 'info'); return; }
  var html = '<div style="padding:6px 0">';
  events.forEach(function(e){
    html += '<div class="notif-item ' + (e.type === 'exam' ? 'exam' : 'review') + '" style="margin-bottom:8px;' + (e.lessonId ? 'cursor:pointer' : '') + '" ' + (e.lessonId ? 'onclick="closeDayModal();openLesson(\'' + e.lessonId + '\')"' : '') + '>' +
      '<div class="notif-icon"><i class="fa-solid ' + (e.type === 'exam' ? 'fa-file-pen' : 'fa-rotate') + '"></i></div>' +
      '<div class="notif-content"><div class="notif-title">' + escapeHtml(e.title) + '</div><div class="notif-body">' + escapeHtml(e.subj) + '</div></div></div>';
  });
  html += '</div>';
  var ex = document.getElementById('dayEventsModal'); if(ex) ex.remove();
  var modal = document.createElement('div');
  modal.className = 'modal-overlay show';
  modal.id = 'dayEventsModal';
  modal.onclick = function(e){ if(e.target === modal) closeDayModal(); };
  modal.innerHTML = '<div class="modal narrow"><div class="modal-header"><div class="modal-title"><i class="fa-solid fa-calendar-day"></i><span>' + day + ' / ' + (month+1) + '</span></div><button class="modal-close" onclick="closeDayModal()"><i class="fa-solid fa-xmark"></i></button></div><div class="modal-body">' + html + '</div></div>';
  document.body.appendChild(modal);
}
function closeDayModal(){ var m = document.getElementById('dayEventsModal'); if(m) m.remove(); }

/* ============ TASKS ============ */
function renderTasksPage(el){
  var tasks = state.tasks || [];
  var active = tasks.filter(function(t){ return !t.completed; });
  var done = tasks.filter(function(t){ return t.completed; });
  var high = active.filter(function(t){ return t.priority === 'high'; }).length;
  el.innerHTML = '<div class="page-header"><div class="page-header-left"><h1><i class="fa-solid fa-list-check"></i> المهام</h1><p>نظّم مهامك اليومية</p></div>' +
    '<div class="page-header-actions"><button class="btn btn-primary" onclick="openTaskModal()"><i class="fa-solid fa-plus"></i> مهمة</button></div></div>' +
    '<div class="quick-stats">' +
      '<div class="quick-stat"><div class="quick-stat-icon"><i class="fa-solid fa-list-check"></i></div><div class="quick-stat-body"><div class="quick-stat-num">' + active.length + '</div><div class="quick-stat-lbl">نشطة</div></div></div>' +
      '<div class="quick-stat"><div class="quick-stat-icon"><i class="fa-solid fa-circle-check"></i></div><div class="quick-stat-body"><div class="quick-stat-num">' + done.length + '</div><div class="quick-stat-lbl">مكتملة</div></div></div>' +
      '<div class="quick-stat"><div class="quick-stat-icon"><i class="fa-solid fa-fire"></i></div><div class="quick-stat-body"><div class="quick-stat-num">' + high + '</div><div class="quick-stat-lbl">عاجلة</div></div></div>' +
    '</div>' +
    (tasks.length === 0 ? '<div class="empty-state"><div class="empty-state-icon"><i class="fa-solid fa-list-check"></i></div><h2>لا مهام</h2><button class="btn btn-primary btn-lg" onclick="openTaskModal()"><i class="fa-solid fa-plus"></i> إضافة</button></div>' :
      '<div class="section"><h3><i class="fa-solid fa-hourglass-half"></i> النشطة (' + active.length + ')</h3>' +
      (active.length === 0 ? '<p style="color:var(--muted);text-align:center;padding:20px">كل المهام مكتملة! 🎉</p>' : active.map(renderTaskItem).join('')) + '</div>' +
      (done.length > 0 ? '<div class="section"><h3><i class="fa-solid fa-check-double"></i> المكتملة (' + done.length + ')</h3>' + done.slice(0,30).map(renderTaskItem).join('') + '</div>' : ''));
}

function renderTaskItem(t){
  var colors = {high:'var(--red)', normal:'var(--primary)', low:'var(--muted)'};
  var labels = {high:'مهم', normal:'عادي', low:'منخفض'};
  return '<div class="card-item" style="' + (t.completed ? 'opacity:.55' : '') + '">' +
    '<div onclick="toggleTask(\'' + t.id + '\')" style="width:22px;height:22px;border-radius:6px;border:2px solid var(--primary);cursor:pointer;display:flex;align-items:center;justify-content:center;background:' + (t.completed ? 'var(--primary)' : 'transparent') + '">' + (t.completed ? '<i class="fa-solid fa-check" style="font-size:12px;color:#fff"></i>' : '') + '</div>' +
    '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px;margin-bottom:4px;' + (t.completed ? 'text-decoration:line-through' : '') + '">' + escapeHtml(t.title) + '</div>' +
    '<div style="font-size:11px;color:var(--muted);display:flex;gap:12px;flex-wrap:wrap"><span style="color:' + colors[t.priority] + '"><i class="fa-solid fa-flag"></i> ' + labels[t.priority] + '</span>' +
    (t.due_date ? '<span><i class="fa-regular fa-calendar"></i> ' + fmtDate(t.due_date) + '</span>' : '') + '</div></div>' +
    '<i class="fa-solid fa-trash" style="color:var(--red);cursor:pointer;opacity:.5;font-size:13px;padding:4px" onclick="deleteTask(\'' + t.id + '\')"></i></div>';
}

function openTaskModal(){ document.getElementById('taskTitleInput').value = ''; document.getElementById('taskPriorityInput').value = 'normal'; document.getElementById('taskDateInput').value = ''; openModal('taskModal'); }

async function saveTask(){
  var title = document.getElementById('taskTitleInput').value.trim();
  var priority = document.getElementById('taskPriorityInput').value;
  var dueDate = document.getElementById('taskDateInput').value;
  if(!title){ toast('اكتب المهمة', 'warning'); return; }
  var r = await sb.from('tasks').insert({user_id:currentUser.id, title:title, priority:priority, due_date:dueDate || null, completed:false}).select().single();
  if(r.error){ toast('خطأ', 'error'); return; }
  state.tasks.unshift(r.data);
  closeModal('taskModal');
  playSound('success');
  toast('تمت الإضافة', 'success');
  updateTasksBadge();
  updateStreak();
  checkAchievements();
  navigateTo('tasks');
}

async function toggleTask(id){
  var task = state.tasks.find(function(t){ return t.id === id; });
  if(!task) return;
  var ns = !task.completed;
  await sb.from('tasks').update({completed: ns}).eq('id', id);
  task.completed = ns;
  if(ns){ playSound('success'); celebrate(); addXP(5); } else playSound('click');
  updateTasksBadge();
  navigateTo('tasks');
}

async function deleteTask(id){
  if(!confirm('حذف؟')) return;
  await sb.from('tasks').delete().eq('id', id);
  state.tasks = state.tasks.filter(function(t){ return t.id !== id; });
  playSound('click');
  toast('تم الحذف', 'success');
  updateTasksBadge();
  navigateTo('tasks');
}

function updateTasksBadge(){
  var a = (state.tasks || []).filter(function(t){ return !t.completed; }).length;
  var b = document.getElementById('tasksBadge');
  var tb = document.getElementById('tasksTabBadge');
  if(b){ b.textContent = a; b.style.display = a > 0 ? 'inline-flex' : 'none'; }
  if(tb){ tb.textContent = a; tb.style.display = a > 0 ? 'block' : 'none'; }
}

/* ============ STATS ============ */
var statusChartInstance = null;

function renderStatsPage(el){
  var totalLessons = 0, memorized = 0, totalCards = 0, dueCards = 0;
  var now = Date.now();
  state.subjects.forEach(function(s){
    totalLessons += s.lessons.length;
    s.lessons.forEach(function(l){
      if(l.status === 'memorized') memorized++;
      totalCards += l.cards.length;
      l.cards.forEach(function(c){ if(!c.nextReview || c.nextReview <= now) dueCards++; });
    });
  });
  var pct = totalLessons ? Math.round(memorized/totalLessons*100) : 0;
  var streak = getStreak();
  var level = state.userStats ? state.userStats.level : 1;
  var xp = state.userStats ? state.userStats.total_xp : 0;
  var xpInLevel = xp % 100;
  var subjHtml = state.subjects.length === 0 ? '<p style="color:var(--muted);text-align:center;padding:20px">أضف مواد</p>' :
    state.subjects.map(function(s){
      var total = s.lessons.length;
      var mem = s.lessons.filter(function(l){ return l.status === 'memorized'; }).length;
      var cards = 0;
      s.lessons.forEach(function(l){ cards += l.cards.length; });
      var p = total ? Math.round(mem/total*100) : 0;
      return '<div style="background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:10px">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><i class="fa-solid ' + s.icon + '" style="color:' + s.color + ';font-size:18px"></i><span style="flex:1;font-weight:800">' + escapeHtml(s.name) + '</span><span style="color:' + s.color + ';font-weight:900;font-size:17px">' + p + '%</span></div>' +
        '<div style="height:8px;background:var(--surface-2);border-radius:4px;overflow:hidden"><div style="height:100%;width:' + p + '%;background:linear-gradient(90deg,' + s.color + ',' + s.colorDark + ');border-radius:4px"></div></div>' +
        '<div style="display:flex;gap:14px;margin-top:10px;font-size:12px;color:var(--muted);flex-wrap:wrap"><span><i class="fa-solid fa-file-lines"></i> ' + total + '</span><span><i class="fa-solid fa-circle-check"></i> ' + mem + '</span><span><i class="fa-solid fa-layer-group"></i> ' + cards + '</span></div></div>';
    }).join('');
  el.innerHTML = '<div class="page-header"><div class="page-header-left"><h1><i class="fa-solid fa-chart-line"></i> الإحصائيات</h1></div></div>' +
    '<div class="quick-stats">' +
      '<div class="quick-stat"><div class="quick-stat-icon"><i class="fa-solid fa-book"></i></div><div class="quick-stat-body"><div class="quick-stat-num">' + state.subjects.length + '</div><div class="quick-stat-lbl">مادة</div></div></div>' +
      '<div class="quick-stat"><div class="quick-stat-icon"><i class="fa-solid fa-file-lines"></i></div><div class="quick-stat-body"><div class="quick-stat-num">' + totalLessons + '</div><div class="quick-stat-lbl">درس</div></div></div>' +
      '<div class="quick-stat"><div class="quick-stat-icon"><i class="fa-solid fa-circle-check"></i></div><div class="quick-stat-body"><div class="quick-stat-num">' + memorized + '</div><div class="quick-stat-lbl">محفوظ</div></div></div>' +
      '<div class="quick-stat"><div class="quick-stat-icon"><i class="fa-solid fa-layer-group"></i></div><div class="quick-stat-body"><div class="quick-stat-num">' + totalCards + '</div><div class="quick-stat-lbl">بطاقة</div></div></div>' +
      '<div class="quick-stat"><div class="quick-stat-icon"><i class="fa-solid fa-clock"></i></div><div class="quick-stat-body"><div class="quick-stat-num">' + dueCards + '</div><div class="quick-stat-lbl">مستحق</div></div></div>' +
      '<div class="quick-stat"><div class="quick-stat-icon"><i class="fa-solid fa-percent"></i></div><div class="quick-stat-body"><div class="quick-stat-num">' + pct + '%</div><div class="quick-stat-lbl">الحفظ</div></div></div>' +
    '</div>' +
    '<div style="background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:#fff;border-radius:16px;padding:20px;margin-bottom:16px"><div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">' +
      '<div style="flex:1;min-width:150px"><div style="font-size:12px;opacity:.9;margin-bottom:4px">المستوى ' + level + '</div><div style="font-size:36px;font-weight:900">' + xp + ' XP</div></div>' +
      '<div style="flex:1;min-width:200px"><div style="background:rgba(255,255,255,.25);height:10px;border-radius:5px;overflow:hidden;margin-bottom:8px"><div style="height:100%;width:' + xpInLevel + '%;background:#fff;border-radius:5px"></div></div><div style="font-size:12px;opacity:.9">' + xpInLevel + '/100 للمستوى التالي</div></div>' +
      '<div style="text-align:center"><i class="fa-solid fa-fire" style="font-size:32px"></i><div style="font-size:20px;font-weight:900">' + streak + '</div><div style="font-size:11px;opacity:.9">يوم متتالي</div></div>' +
    '</div></div>' +
    '<div class="section"><h3><i class="fa-solid fa-chart-pie"></i> توزيع الدروس</h3><div style="height:300px;position:relative"><canvas id="statusChart"></canvas></div></div>' +
    '<div class="section"><h3><i class="fa-solid fa-chart-simple"></i> التقدم في كل مادة</h3>' + subjHtml + '</div>';
  setTimeout(drawStatusChart, 100);
}

function drawStatusChart(){
  if(typeof Chart === 'undefined') return;
  if(statusChartInstance){ try{ statusChartInstance.destroy(); }catch(e){} statusChartInstance = null; }
  var c = {new:0, reading:0, partial:0, memorized:0, needs_review:0};
  state.subjects.forEach(function(s){ s.lessons.forEach(function(l){ if(c[l.status] !== undefined) c[l.status]++; }); });
  var ctx = document.getElementById('statusChart');
  if(!ctx) return;
  var isL = document.body.getAttribute('data-mode') === 'light';
  var tc = isL ? '#4A4A4A' : '#8A8A8A';
  statusChartInstance = new Chart(ctx, {
    type:'doughnut',
    data:{labels:['جديد','قيد الفهم','جزئي','محفوظ','مراجعة'], datasets:[{data:[c.new, c.reading, c.partial, c.memorized, c.needs_review], backgroundColor:['#6B7280','#EAB308','#3B82F6','#22C55E','#EF4444'], borderWidth:0}]},
    options:{responsive:true, maintainAspectRatio:false, cutout:'65%', plugins:{legend:{position:'bottom', labels:{color:tc, font:{family:'Tajawal', size:13}, padding:15, usePointStyle:true, pointStyle:'circle'}}}}
  });
}

/* ============ ACHIEVEMENTS ============ */
var ACHIEVEMENTS = [
  {id:'first_lesson', icon:'fa-seedling', title:'البداية', desc:'أضفت أول درس', check:function(s){ return s.subjects.some(function(x){ return x.lessons.length > 0; }); }},
  {id:'first_card', icon:'fa-layer-group', title:'أول بطاقة', desc:'أضفت أول بطاقة', check:function(s){ return s.subjects.some(function(x){ return x.lessons.some(function(l){ return l.cards.length > 0; }); }); }},
  {id:'ten_cards', icon:'fa-cards-blank', title:'جامع البطاقات', desc:'10 بطاقات', check:function(s){ var n = 0; s.subjects.forEach(function(x){ x.lessons.forEach(function(l){ n += l.cards.length; }); }); return n >= 10; }},
  {id:'fifty_cards', icon:'fa-medal', title:'محترف البطاقات', desc:'50 بطاقة', check:function(s){ var n = 0; s.subjects.forEach(function(x){ x.lessons.forEach(function(l){ n += l.cards.length; }); }); return n >= 50; }},
  {id:'first_feynman', icon:'fa-brain', title:'الفاهم', desc:'فهمت درس', check:function(s){ return s.subjects.some(function(x){ return x.lessons.some(function(l){ return l.feynman && l.feynman.done; }); }); }},
  {id:'first_memorized', icon:'fa-circle-check', title:'الحافظ', desc:'حفظت درس', check:function(s){ return s.subjects.some(function(x){ return x.lessons.some(function(l){ return l.status === 'memorized'; }); }); }},
  {id:'five_memorized', icon:'fa-star', title:'نجم الحفظ', desc:'5 دروس محفوظة', check:function(s){ var n = 0; s.subjects.forEach(function(x){ x.lessons.forEach(function(l){ if(l.status === 'memorized') n++; }); }); return n >= 5; }},
  {id:'ten_lessons', icon:'fa-book-open', title:'المجتهد', desc:'10 دروس', check:function(s){ var n = 0; s.subjects.forEach(function(x){ n += x.lessons.length; }); return n >= 10; }},
  {id:'streak_3', icon:'fa-fire', title:'3 أيام', desc:'3 أيام متتالية', check:function(){ return getStreak() >= 3; }},
  {id:'streak_7', icon:'fa-fire-flame-curved', title:'أسبوع كامل', desc:'7 أيام متتالية', check:function(){ return getStreak() >= 7; }},
  {id:'streak_30', icon:'fa-crown', title:'شهر أسطوري', desc:'30 يوم', check:function(){ return getStreak() >= 30; }},
  {id:'pomodoro', icon:'fa-clock', title:'المركّز', desc:'أكملت بومودورو', check:function(){ return localStorage.getItem('pomodoro_done') === 'true'; }},
  {id:'scheduler', icon:'fa-calendar-check', title:'المنظّم', desc:'جدول حصص', check:function(s){ return (s.schedule || []).length > 0; }},
  {id:'all_subjects', icon:'fa-graduation-cap', title:'الطالب المثالي', desc:'5 مواد', check:function(s){ return s.subjects.length >= 5; }},
  {id:'first_grade', icon:'fa-calculator', title:'حاسب المعدل', desc:'أضفت علامة', check:function(s){ return (s.grades || []).length > 0; }},
  {id:'first_task', icon:'fa-list-check', title:'المنظّم الصغير', desc:'مهمة', check:function(s){ return (s.tasks || []).length > 0; }},
  {id:'level_5', icon:'fa-star-half-stroke', title:'مستوى 5', desc:'وصلت للمستوى 5', check:function(s){ return (s.userStats && s.userStats.level >= 5); }},
  {id:'level_10', icon:'fa-star', title:'مستوى 10', desc:'وصلت للمستوى 10', check:function(s){ return (s.userStats && s.userStats.level >= 10); }}
];

function checkAchievements(){
  var unlocked = JSON.parse(localStorage.getItem('achievements') || '[]');
  ACHIEVEMENTS.forEach(function(a){
    if(unlocked.indexOf(a.id) === -1 && a.check(state)){
      unlocked.push(a.id);
      localStorage.setItem('achievements', JSON.stringify(unlocked));
      playSound('complete');
      celebrate();
      pushNotif('info', '🏆 إنجاز جديد!', a.title + ' — ' + a.desc);
    }
  });
  checkSeasonalBadges();
}

function renderAchievementsPage(el){
  var unlocked = JSON.parse(localStorage.getItem('achievements') || '[]');
  var total = ACHIEVEMENTS.length;
  var done = unlocked.length;
  var pct = Math.round(done/total*100);
  el.innerHTML = '<div class="page-header"><div class="page-header-left"><h1><i class="fa-solid fa-trophy"></i> الإنجازات</h1></div></div>' +
    '<div style="background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:#fff;border-radius:16px;padding:24px;margin-bottom:20px;text-align:center"><i class="fa-solid fa-trophy" style="font-size:48px;margin-bottom:12px"></i><h2 style="font-size:28px;font-weight:900;margin-bottom:6px">' + done + ' / ' + total + '</h2><p style="opacity:.9">إنجازات مفتوحة (' + pct + '%)</p><div style="background:rgba(255,255,255,.25);height:10px;border-radius:5px;margin-top:16px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:#fff"></div></div></div>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px">' +
      ACHIEVEMENTS.map(function(a){
        var u = unlocked.indexOf(a.id) !== -1;
        return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px;text-align:center;' + (u ? 'border-color:var(--primary);background:linear-gradient(135deg,var(--surface),var(--primary-soft))' : 'opacity:.5') + '">' +
          '<div style="width:60px;height:60px;border-radius:18px;display:inline-flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:10px;background:' + (u ? 'var(--primary-soft);color:var(--primary)' : 'var(--bg);color:var(--muted)') + '"><i class="fa-solid ' + a.icon + '"></i></div>' +
          '<div style="font-weight:800;font-size:15px;margin-bottom:4px">' + a.title + '</div>' +
          '<div style="font-size:12px;color:var(--muted)">' + a.desc + '</div>' +
          '<div style="margin-top:8px;font-size:11px;font-weight:700;color:' + (u ? 'var(--green)' : 'var(--muted)') + '">' + (u ? '<i class="fa-solid fa-check-circle"></i> مفتوح' : '<i class="fa-solid fa-lock"></i> مغلق') + '</div></div>';
      }).join('') +
    '</div>';
}

/* Seasonal */
function checkSeasonalBadges(){
  // Season logic here
}

/* ============ CHALLENGE ============ */
var CHALLENGE_TYPES = [
  {type:'cards', text:'احفظ {n} بطاقات اليوم', targets:[3, 5, 8], xp:30},
  {type:'review', text:'راجع {n} دروس اليوم', targets:[1, 2, 3], xp:40},
  {type:'feynman', text:'افهم {n} درس بفاينمان', targets:[1, 2], xp:50},
  {type:'new_lesson', text:'أضف {n} درس جديد', targets:[1, 2], xp:25},
  {type:'pomodoro', text:'أكمل {n} جلسة بومودورو', targets:[1, 2, 3], xp:35},
  {type:'spaced', text:'أنجز {n} مراجعة متباعدة', targets:[1, 2], xp:30}
];

async function generateDailyChallenge(){
  if(!currentUser) return;
  var today = new Date().toISOString().split('T')[0];
  var existing = state.challenges.find(function(c){ return c.challenge_date === today; });
  if(existing) return;
  var p = CHALLENGE_TYPES[Math.floor(Math.random() * CHALLENGE_TYPES.length)];
  var target = p.targets[Math.floor(Math.random() * p.targets.length)];
  var text = p.text.replace('{n}', target);
  var r = await sb.from('daily_challenges').insert({
    user_id: currentUser.id, challenge_date: today,
    challenge_type: p.type, challenge_text: text, target: target, xp_reward: p.xp
  }).select().single();
  if(r.data) state.challenges.push(r.data);
}

function renderChallengeBadge(){
  var today = new Date().toISOString().split('T')[0];
  var c = state.challenges.find(function(x){ return x.challenge_date === today; });
  var b = document.getElementById('challengeText');
  if(!b) return;
  if(!c) b.textContent = 'ابدأ';
  else if(c.completed) b.textContent = '✅ تم';
  else b.textContent = c.progress + '/' + c.target;
}

function renderChallengePage(el){
  var today = new Date().toISOString().split('T')[0];
  var c = state.challenges.find(function(x){ return x.challenge_date === today; });
  var level = state.userStats ? state.userStats.level : 1;
  var xp = state.userStats ? state.userStats.total_xp : 0;
  var xpIn = xp % 100;
  var comp = state.userStats ? state.userStats.challenges_completed : 0;
  var days = getLast7Days();
  var weekHtml = days.map(function(d){
    var c2 = state.challenges.find(function(x){ return x.challenge_date === d.date; });
    var done = c2 && c2.completed;
    return '<div style="text-align:center;flex:1;min-width:44px"><div style="width:40px;height:40px;border-radius:50%;margin:0 auto;display:flex;align-items:center;justify-content:center;' + (done ? 'background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:#fff' : 'background:var(--surface);border:1px solid var(--border);color:var(--muted)') + '">' + (done ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-circle" style="font-size:8px"></i>') + '</div><div style="font-size:10px;color:var(--muted);margin-top:6px">' + d.label + '</div></div>';
  }).join('');
  el.innerHTML = '<div class="page-header"><div class="page-header-left"><h1><i class="fa-solid fa-bullseye"></i> التحدي اليومي</h1></div></div>' +
    '<div style="background:linear-gradient(135deg,#8B5CF6,#6D28D9);color:#fff;border-radius:16px;padding:24px;margin-bottom:20px;text-align:center">' +
      '<i class="fa-solid fa-star" style="font-size:36px;margin-bottom:10px"></i>' +
      '<div style="font-size:13px;opacity:.9">المستوى</div>' +
      '<div style="font-size:52px;font-weight:900;line-height:1">' + level + '</div>' +
      '<div style="background:rgba(255,255,255,.25);height:10px;border-radius:5px;margin-top:16px;overflow:hidden"><div style="height:100%;width:' + xpIn + '%;background:#fff;border-radius:5px"></div></div>' +
      '<div style="font-size:12px;margin-top:8px;opacity:.9">' + xpIn + '/100 XP — المجموع: ' + xp + '</div>' +
    '</div>' +
    (c ? '<div class="section" style="border:2px solid var(--primary)"><h3><i class="fa-solid fa-flag-checkered"></i> تحدي اليوم</h3>' +
      '<div style="text-align:center;padding:16px 0">' +
      '<div style="font-size:18px;font-weight:700;margin-bottom:14px">' + escapeHtml(c.challenge_text) + '</div>' +
      '<div style="font-size:13px;color:var(--muted);margin-bottom:14px">التقدم: <b style="color:var(--primary)">' + c.progress + ' / ' + c.target + '</b></div>' +
      '<div style="background:var(--surface-2);height:14px;border-radius:7px;overflow:hidden;margin-bottom:16px"><div style="height:100%;width:' + Math.min(100, (c.progress/c.target*100)) + '%;background:linear-gradient(90deg,var(--primary),var(--primary-dark))"></div></div>' +
      '<div style="font-size:13px;color:var(--muted);margin-bottom:18px"><i class="fa-solid fa-gift"></i> المكافأة: <b style="color:var(--primary)">' + c.xp_reward + ' XP</b></div>' +
      (c.completed ? '<div style="color:var(--green);font-size:16px;font-weight:700"><i class="fa-solid fa-check-circle"></i> تم إكمال التحدي! 🎉</div>' : '<button class="btn btn-primary" onclick="progressChallenge()"><i class="fa-solid fa-plus"></i> سجل تقدم</button>') +
      '</div></div>' : '<div class="empty-state" style="min-height:30vh"><div class="empty-state-icon"><i class="fa-solid fa-bullseye"></i></div><h2>لا يوجد تحدي</h2></div>') +
    '<div class="section"><h3><i class="fa-solid fa-trophy"></i> إحصائياتك</h3><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">' +
      '<div style="text-align:center;background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:16px"><i class="fa-solid fa-bullseye" style="font-size:24px;color:var(--primary);margin-bottom:8px;display:inline-block"></i><div style="font-size:24px;font-weight:900;color:var(--primary)">' + comp + '</div><div style="font-size:11px;color:var(--muted)">تحديات</div></div>' +
      '<div style="text-align:center;background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:16px"><i class="fa-solid fa-star" style="font-size:24px;color:var(--primary);margin-bottom:8px;display:inline-block"></i><div style="font-size:24px;font-weight:900;color:var(--primary)">' + xp + '</div><div style="font-size:11px;color:var(--muted)">XP</div></div>' +
      '<div style="text-align:center;background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:16px"><i class="fa-solid fa-layer-group" style="font-size:24px;color:var(--primary);margin-bottom:8px;display:inline-block"></i><div style="font-size:24px;font-weight:900;color:var(--primary)">' + level + '</div><div style="font-size:11px;color:var(--muted)">المستوى</div></div>' +
    '</div></div>' +
    '<div class="section"><h3><i class="fa-solid fa-clock-rotate-left"></i> آخر 7 أيام</h3><div style="display:flex;gap:8px;justify-content:space-around;flex-wrap:wrap">' + weekHtml + '</div></div>';
}

function getLast7Days(){
  var days = ['ح','ن','ث','ر','خ','ج','س'];
  var r = [];
  for(var i = 6; i >= 0; i--){
    var d = new Date(Date.now() - i * 86400000);
    r.push({date:d.toISOString().split('T')[0], label:days[d.getDay()]});
  }
  return r;
}

async function progressChallenge(){
  var today = new Date().toISOString().split('T')[0];
  var c = state.challenges.find(function(x){ return x.challenge_date === today; });
  if(!c || c.completed) return;
  var np = Math.min(c.progress + 1, c.target);
  var completed = np >= c.target;
  var r = await sb.from('daily_challenges').update({progress:np, completed:completed}).eq('id', c.id).select().single();
  if(r.error){ toast('خطأ', 'error'); return; }
  c.progress = np;
  c.completed = completed;
  if(completed){ await addXP(c.xp_reward); playSound('complete'); bigCelebrate(); toast('🎉 أكملت التحدي!', 'success'); }
  else playSound('click');
  renderChallengeBadge();
  navigateTo('challenge');
}

/* ============ XP ============ */
async function addXP(amount){
  if(!state.userStats) return;
  var nxp = state.userStats.total_xp + amount;
  var nl = Math.floor(nxp/100) + 1;
  var leveled = nl > state.userStats.level;
  var r = await sb.from('user_stats').update({total_xp:nxp, level:nl, updated_at:new Date().toISOString()}).eq('id', state.userStats.id).select().single();
  if(r.data){
    state.userStats = r.data;
    if(leveled) setTimeout(function(){ toast('⭐ ارتقيت للمستوى ' + nl + '!', 'success'); bigCelebrate(); playSound('complete'); }, 800);
  }
}

/* ============ RIGHT PANEL ============ */
function renderRightPanel(){
  var body = document.getElementById('rightPanelBody');
  if(!body) return;
  var tl = 0, dc = 0, mc = 0, now = Date.now();
  state.subjects.forEach(function(s){
    tl += s.lessons.length;
    s.lessons.forEach(function(l){
      if(l.status === 'memorized') mc++;
      l.cards.forEach(function(c){ if(!c.nextReview || c.nextReview <= now) dc++; });
    });
  });
  var today = new Date().toISOString().split('T')[0];
  var c = state.challenges.find(function(x){ return x.challenge_date === today; });
  body.innerHTML = '<div class="mini-card"><div class="mini-card-title"><i class="fa-solid fa-chart-simple"></i> ملخص</div>' +
    '<div style="display:flex;flex-direction:column;gap:10px;font-size:13px">' +
    '<div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">مواد:</span><span style="font-weight:700">' + state.subjects.length + '</span></div>' +
    '<div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">دروس:</span><span style="font-weight:700">' + tl + '</span></div>' +
    '<div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">محفوظ:</span><span style="font-weight:700;color:var(--green)">' + mc + '</span></div>' +
    '<div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">مستحق:</span><span style="font-weight:700;color:var(--red)">' + dc + '</span></div>' +
    '</div></div>' +
    (c ? '<div class="mini-card" style="border:1px solid var(--primary)"><div class="mini-card-title"><i class="fa-solid fa-bullseye"></i> تحدي اليوم</div><div style="font-size:13px;line-height:1.6;margin-bottom:8px">' + escapeHtml(c.challenge_text) + '</div><div style="height:8px;background:var(--surface-2);border-radius:4px;overflow:hidden"><div style="height:100%;width:' + Math.min(100, c.progress/c.target*100) + '%;background:linear-gradient(90deg,var(--primary),var(--primary-dark))"></div></div></div>' : '') +
    '<div class="mini-card"><div class="mini-card-title"><i class="fa-solid fa-lightbulb"></i> نصيحة</div><div style="font-size:13px;line-height:1.7;color:var(--text-2)">استعمل تقنية فاينمان: اشرح الدرس بصوت عال كأنك تعلّمه لطفل.</div></div>';
}

/* ============ SETTINGS ============ */
function openSettings(){
  var body = document.getElementById('settingsBody');
  if(!body) return;
  var s = state.settings;
  body.innerHTML =
    '<div class="settings-section"><div class="settings-section-head"><div class="settings-section-icon"><i class="fa-solid fa-palette"></i></div><div class="settings-section-title"><h3>المظهر</h3><p>خصّص شكل التطبيق</p></div></div>' +
    '<div class="form-group"><label class="form-label">اللون الأساسي</label><div class="theme-options">' +
      ['orange','purple','blue','green','pink','gold','red','cyan','indigo'].map(function(t){ return '<div class="theme-option ' + (s.theme === t ? 'selected' : '') + '" data-theme="' + t + '" onclick="changeTheme(\'' + t + '\')"></div>'; }).join('') +
    '</div></div>' +
    '<div class="settings-row"><div class="settings-row-info"><div class="settings-row-label"><i class="fa-solid fa-moon"></i> الوضع الليلي</div><div class="settings-row-desc">تبديل يدوي</div></div><label class="switch"><input type="checkbox" ' + (s.mode === 'dark' ? 'checked' : '') + ' onchange="toggleThemeMode()"><span class="switch-track"></span></label></div>' +
    '</div>' +
    '<div class="settings-section"><div class="settings-section-head"><div class="settings-section-icon"><i class="fa-solid fa-font"></i></div><div class="settings-section-title"><h3>الخط</h3></div></div>' +
    '<div class="font-options">' +
      [{name:'Tajawal', label:'طجوال'},{name:'Cairo', label:'القاهرة'},{name:'Almarai', label:'المراعي'},{name:'El Messiri', label:'المسيري'}].map(function(f){
        return '<div class="font-option ' + (s.font === f.name ? 'selected' : '') + '" data-font="' + f.name + '" onclick="changeFont(\'' + f.name + '\')" style="font-family:\'' + f.name + '\',sans-serif"><div class="font-option-preview">مِذكَرتي — ' + f.name + '</div><div class="font-option-name">' + f.label + '</div></div>';
      }).join('') +
    '</div></div>' +
    '<div class="settings-section"><div class="settings-section-head"><div class="settings-section-icon"><i class="fa-solid fa-volume-high"></i></div><div class="settings-section-title"><h3>الصوت</h3></div></div>' +
    '<div class="settings-row"><div class="settings-row-info"><div class="settings-row-label"><i class="fa-solid fa-bell"></i> تفعيل الأصوات</div></div><label class="switch"><input type="checkbox" ' + (soundEnabled ? 'checked' : '') + ' onchange="soundEnabled = this.checked; saveSettings();"><span class="switch-track"></span></label></div>' +
    '</div>' +
    '<div class="settings-section danger-zone"><div class="settings-section-head"><div class="settings-section-icon"><i class="fa-solid fa-triangle-exclamation"></i></div><div class="settings-section-title"><h3>منطقة الخطر</h3></div></div>' +
    '<button class="btn btn-danger btn-sm" onclick="signOut()"><i class="fa-solid fa-right-from-bracket"></i> تسجيل الخروج</button></div>' +
    '<div class="settings-section" style="text-align:center"><div style="color:var(--muted);font-size:12px;line-height:1.8"><div style="font-size:20px;font-weight:900;color:var(--primary);margin-bottom:6px">مِذكَرتي</div><div>الإصدار 3.0 · صُنع بحب في الجزائر 🇩🇿</div></div></div>';
  openModal('settingsModal');
}

/* ============ PET ============ */
function getPetData(){
  try{ var d = JSON.parse(localStorage.getItem('pet_data')); if(d) return d; }catch(e){}
  return {name:'مشمش', emoji:'🐱', level:1, happiness:100, lastFed:Date.now()};
}
function savePetData(d){ localStorage.setItem('pet_data', JSON.stringify(d)); }
function updatePetWidget(){
  var p = getPetData();
  var h = (Date.now() - p.lastFed) / 3600000;
  p.happiness = Math.max(0, 100 - h * 2);
  p.level = Math.floor((state.userStats ? state.userStats.total_xp : 0) / 100) + 1;
  var mood = '😊';
  if(p.happiness < 30) mood = '😢';
  else if(p.happiness < 60) mood = '😐';
  else if(p.happiness > 90) mood = '🥰';
  var w = document.getElementById('petWidget');
  if(w) w.innerHTML = p.emoji + '<div id="petMood">' + mood + '</div>';
  savePetData(p);
}
function openPetModal(){
  var p = getPetData();
  var h = Math.floor((Date.now() - p.lastFed) / 3600000);
  var html = '<div class="modal-overlay show" id="petModal" onclick="if(event.target===this)closePetModal()"><div class="modal narrow">' +
    '<div class="modal-header"><div class="modal-title"><i class="fa-solid fa-paw"></i><span>حيوانك الأليف</span></div><button class="modal-close" onclick="closePetModal()"><i class="fa-solid fa-xmark"></i></button></div>' +
    '<div class="modal-body" style="text-align:center">' +
    '<div style="font-size:80px;margin:20px 0">' + p.emoji + '</div>' +
    '<h2 style="color:var(--primary);font-weight:900;margin-bottom:8px">' + p.name + '</h2>' +
    '<p style="color:var(--muted);font-size:14px;margin-bottom:20px">المستوى ' + p.level + '</p>' +
    '<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:12px">' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px"><span>السعادة</span><span style="color:var(--primary);font-weight:700">' + Math.round(p.happiness) + '%</span></div>' +
    '<div style="height:10px;background:var(--surface-2);border-radius:5px;overflow:hidden"><div style="height:100%;width:' + p.happiness + '%;background:linear-gradient(90deg,var(--primary),var(--primary-dark))"></div></div></div>' +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:16px">آخر إطعام: ' + (h === 0 ? 'الآن' : h + ' ساعة') + '</div>' +
    '<div style="display:flex;gap:8px"><button class="btn btn-primary" style="flex:1;justify-content:center" onclick="feedPet()"><i class="fa-solid fa-bowl-food"></i> أطعمه</button>' +
    '<button class="btn btn-ghost" style="flex:1;justify-content:center" onclick="playPet()"><i class="fa-solid fa-baseball"></i> العب</button></div></div></div></div>';
  var e = document.getElementById('petModal'); if(e) e.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}
function closePetModal(){ var m = document.getElementById('petModal'); if(m) m.remove(); }
function feedPet(){ var p = getPetData(); p.happiness = Math.min(100, p.happiness + 20); p.lastFed = Date.now(); savePetData(p); playSound('success'); celebrate(); toast('😋 ' + p.name + ' أكل!', 'success'); closePetModal(); }
function playPet(){ var p = getPetData(); p.happiness = Math.min(100, p.happiness + 15); savePetData(p); playSound('success'); celebrate(); toast('🎾 ' + p.name + ' يلعب!', 'success'); closePetModal(); }

setTimeout(updatePetWidget, 2000);
setInterval(updatePetWidget, 5 * 60 * 1000);

/* ============ AI ANALYSIS ============ */
function analyzePerformance(){
  var tl = 0, mem = 0, tc = 0;
  var subs = [];
  state.subjects.forEach(function(s){
    var t = s.lessons.length;
    var m = s.lessons.filter(function(l){ return l.status === 'memorized'; }).length;
    var c = 0;
    s.lessons.forEach(function(l){ c += l.cards.length; });
    tl += t; mem += m; tc += c;
    subs.push({name:s.name, total:t, pct:t ? Math.round(m/t*100) : 0});
  });
  var pct = tl ? Math.round(mem/tl*100) : 0;
  var insights = [];
  if(pct >= 80) insights.push({t:'good', i:'🏆', m:'أداء ممتاز! حفظت ' + pct + '%'});
  else if(pct >= 50) insights.push({t:'info', i:'👍', m:'أداء جيد! حفظت ' + pct + '%'});
  else if(pct >= 30) insights.push({t:'warn', i:'💪', m:'تحتاج جهد أكثر'});
  else insights.push({t:'warn', i:'🚨', m:'ابدأ الآن!'});
  if(subs.length > 0){
    var best = subs.slice().sort(function(a,b){ return b.pct - a.pct; })[0];
    if(best.pct > 0) insights.push({t:'good', i:'⭐', m:'أفضل مادة: ' + best.name});
    var worst = subs.slice().sort(function(a,b){ return a.pct - b.pct; })[0];
    if(worst.pct < 50 && worst.total > 0) insights.push({t:'warn', i:'📚', m:'تحتاج تركيز: ' + worst.name});
  }
  var hour = new Date().getHours();
  if(hour >= 20 || hour < 5) insights.push({t:'info', i:'🌙', m:'تدرس في الليل'});
  else if(hour >= 5 && hour < 12) insights.push({t:'good', i:'☀️', m:'تدرس في الصباح'});
  else insights.push({t:'info', i:'🌤️', m:'تدرس في النهار'});
  var streak = getStreak();
  if(streak >= 7) insights.push({t:'good', i:'🔥', m:'سلسلة رائعة! ' + streak + ' يوم'});
  else if(streak >= 3) insights.push({t:'info', i:'🔥', m:'استمر! ' + streak + ' أيام'});
  else insights.push({t:'warn', i:'⚡', m:'حاول تدرس كل يوم'});
  var sugg = [];
  if(state.subjects.length < 5) sugg.push('أضف المزيد من المواد');
  if(tc < 20) sugg.push('أضف المزيد من البطاقات');
  if(streak < 3) sugg.push('حافظ على الدراسة اليومية');
  if(tl > mem) sugg.push('راجع ' + (tl - mem) + ' درس متبقي');
  var html = '<div class="modal-overlay show" id="analysisModal" onclick="if(event.target===this)closeAnalysis()"><div class="modal wide">' +
    '<div class="modal-header"><div class="modal-title"><i class="fa-solid fa-brain"></i><span>تحليل الأداء</span></div><button class="modal-close" onclick="closeAnalysis()"><i class="fa-solid fa-xmark"></i></button></div>' +
    '<div class="modal-body">' +
    '<div style="background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:#fff;border-radius:16px;padding:20px;margin-bottom:20px;text-align:center"><div style="font-size:48px;margin-bottom:8px">📊</div><div style="font-size:36px;font-weight:900">' + pct + '%</div><div style="font-size:13px;opacity:.9;margin-top:6px">نسبة الحفظ</div></div>' +
    '<h3 style="font-size:15px;color:var(--primary);margin-bottom:12px"><i class="fa-solid fa-chart-line"></i> ملاحظات ذكية</h3>' +
    insights.map(function(ins){
      var colors = {good:'background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);color:#86EFAC', info:'background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.3);color:#93C5FD', warn:'background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.3);color:#FDE68A'};
      return '<div style="' + colors[ins.t] + ';border-radius:12px;padding:12px 14px;margin-bottom:8px;font-size:13px;line-height:1.6;display:flex;gap:10px"><span style="font-size:18px">' + ins.i + '</span><span>' + ins.m + '</span></div>';
    }).join('') +
    (sugg.length > 0 ? '<h3 style="font-size:15px;color:var(--primary);margin:20px 0 12px"><i class="fa-solid fa-lightbulb"></i> اقتراحات</h3>' + sugg.map(function(s){ return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:8px;font-size:13px">💡 ' + s + '</div>'; }).join('') : '') +
    '<button class="btn btn-primary btn-block" style="margin-top:20px" onclick="closeAnalysis()"><i class="fa-solid fa-check"></i> فهمت</button>' +
    '</div></div></div>';
  var e = document.getElementById('analysisModal'); if(e) e.remove();
  document.body.insertAdjacentHTML('beforeend', html);
  playSound('click');
}
function closeAnalysis(){ var m = document.getElementById('analysisModal'); if(m) m.remove(); }

/* ============ GROUPS ============ */
async function openGroupsPage(){
  var content = document.getElementById('content');
  var titleEl = document.getElementById('pageTitle');
  if(titleEl) titleEl.textContent = 'المجموعات';
  content.innerHTML = '<div class="content-page"><div class="empty-box" style="text-align:center;padding:48px"><i class="fa-solid fa-spinner fa-spin" style="font-size:48px;color:var(--primary)"></i><p style="margin-top:14px">جاري التحميل...</p></div></div>';
  var pageEl = content.querySelector('.content-page');
  var r = await sb.from('group_members').select('group_id, study_groups(id, name, code, owner_id)').eq('user_id', currentUser.id);
  var groups = (r.data || []).map(function(m){ return m.study_groups; }).filter(Boolean);
  pageEl.innerHTML = '<div class="page-header"><div class="page-header-left"><h1><i class="fa-solid fa-users"></i> المجموعات</h1><p>ادرس مع أصحابك</p></div>' +
    '<div class="page-header-actions"><button class="btn btn-primary" onclick="openCreateGroupModal()"><i class="fa-solid fa-plus"></i> مجموعة</button>' +
    '<button class="btn btn-ghost" onclick="openJoinGroupModal()"><i class="fa-solid fa-right-to-bracket"></i> انضم</button></div></div>' +
    (groups.length === 0 ? '<div class="empty-state"><div class="empty-state-icon"><i class="fa-solid fa-users"></i></div><h2>لا مجموعات</h2></div>' :
      '<div class="subjects-grid">' + groups.map(function(g){
        return '<div class="subject-card" style="--subject-color:#FF7A00;--subject-color-dark:#E65100">' +
          '<div class="subject-card-head"><div class="subject-icon"><i class="fa-solid fa-users"></i></div></div>' +
          '<div class="subject-card-body"><div class="subject-card-name">' + escapeHtml(g.name) + '</div>' +
          '<div class="subject-card-meta"><span><i class="fa-solid fa-key"></i> ' + g.code + '</span></div></div></div>';
      }).join('') + '</div>');
}

function openCreateGroupModal(){
  var code = Math.random().toString(36).substring(2, 8).toUpperCase();
  var html = '<div class="modal-overlay show" id="createGroupModal" onclick="if(event.target===this)this.remove()"><div class="modal narrow">' +
    '<div class="modal-header"><div class="modal-title"><i class="fa-solid fa-users"></i><span>مجموعة جديدة</span></div><button class="modal-close" onclick="document.getElementById(\'createGroupModal\').remove()"><i class="fa-solid fa-xmark"></i></button></div>' +
    '<div class="modal-body"><div class="form-group"><label class="form-label">اسم المجموعة</label><input type="text" class="form-input" id="groupName" placeholder="اسم المجموعة"></div>' +
    '<div class="form-group"><label class="form-label">كود</label><div style="display:flex;gap:8px"><input type="text" class="form-input" value="' + code + '" readonly style="font-family:monospace;font-weight:700;text-align:center;letter-spacing:2px"><button class="btn btn-ghost" onclick="navigator.clipboard.writeText(\'' + code + '\');toast(\'تم النسخ\')"><i class="fa-solid fa-copy"></i></button></div></div></div>' +
    '<div class="modal-footer"><button class="btn btn-ghost" onclick="document.getElementById(\'createGroupModal\').remove()">إلغاء</button><button class="btn btn-primary" onclick="createGroup(\'' + code + '\')">إنشاء</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}

async function createGroup(code){
  var name = document.getElementById('groupName').value.trim();
  if(!name){ toast('اكتب الاسم', 'warning'); return; }
  var r = await sb.from('study_groups').insert({name:name, code:code, owner_id:currentUser.id}).select().single();
  if(r.error){ toast('خطأ', 'error'); return; }
  await sb.from('group_members').insert({group_id:r.data.id, user_id:currentUser.id});
  document.getElementById('createGroupModal').remove();
  playSound('success');
  celebrate();
  toast('🎉 تم إنشاء المجموعة!', 'success');
  openGroupsPage();
}

function openJoinGroupModal(){
  var html = '<div class="modal-overlay show" id="joinGroupModal" onclick="if(event.target===this)this.remove()"><div class="modal narrow">' +
    '<div class="modal-header"><div class="modal-title"><i class="fa-solid fa-right-to-bracket"></i><span>انضم</span></div><button class="modal-close" onclick="document.getElementById(\'joinGroupModal\').remove()"><i class="fa-solid fa-xmark"></i></button></div>' +
    '<div class="modal-body"><div class="form-group"><label class="form-label">كود المجموعة</label><input type="text" class="form-input" id="joinCode" placeholder="ABC123" style="text-align:center;font-family:monospace;font-weight:700;letter-spacing:3px;text-transform:uppercase"></div></div>' +
    '<div class="modal-footer"><button class="btn btn-ghost" onclick="document.getElementById(\'joinGroupModal\').remove()">إلغاء</button><button class="btn btn-primary" onclick="joinGroup()">انضم</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}

async function joinGroup(){
  var code = document.getElementById('joinCode').value.trim().toUpperCase();
  if(!code){ toast('اكتب الكود', 'warning'); return; }
  var r = await sb.from('study_groups').select('id').eq('code', code).single();
  if(r.error || !r.data){ toast('⚠️ الكود غير صحيح', 'error'); return; }
  var c = await sb.from('group_members').select('id').eq('group_id', r.data.id).eq('user_id', currentUser.id).maybeSingle();
  if(c.data){ toast('انت عضو بالفعل', 'info'); return; }
  await sb.from('group_members').insert({group_id:r.data.id, user_id:currentUser.id});
  document.getElementById('joinGroupModal').remove();
  playSound('success');
  celebrate();
  toast('🎉 انضممت!', 'success');
  openGroupsPage();
}

/* ============ KEYBOARD ============ */
document.addEventListener('keydown', function(e){
  var tag = (e.target.tagName || '').toLowerCase();
  if(tag === 'input' || tag === 'textarea' || tag === 'select') return;
  if(e.target.isContentEditable) return;
  if(e.key === 'Escape'){
    document.querySelectorAll('.modal-overlay.show').forEach(function(m){ m.classList.remove('show'); });
    var d = document.getElementById('dayEventsModal'); if(d) d.remove();
    var s = document.getElementById('searchOverlay'); if(s) s.remove();
    var p = document.getElementById('petModal'); if(p) p.remove();
    var a = document.getElementById('analysisModal'); if(a) a.remove();
    document.getElementById('notifPanel').classList.remove('show');
    closePomodoro();
    closeFlashcards();
    closeCalculator();
    return;
  }
  if(document.getElementById('fcOverlay').classList.contains('show')){
    if(e.key === ' '){ e.preventDefault(); if(!fcFlipped) flipCard(); }
    if(fcFlipped){ if(e.key === '1') rateCard(1); if(e.key === '2') rateCard(2); if(e.key === '3') rateCard(3); }
    return;
  }
  if(e.key === 'n' || e.key === 'N'){ if(currentPage === 'subject') openLessonModal(); else openSubjectModal(); }
  if(e.key === 's' || e.key === 'S') openSubjectModal();
  if(e.key === 't' || e.key === 'T') toggleThemeMode();
  if(e.key === 'p' || e.key === 'P') openPomodoro();
  if(e.key === 'm' || e.key === 'M'){ soundEnabled = !soundEnabled; toast(soundEnabled ? 'الأصوات مفعلة' : 'الأصوات مكتومة', 'info'); }
  if(e.key === 'k' || e.key === 'K'){ e.preventDefault(); openSearchModal(); }
  if(e.key === '?') alert('⌨️ اختصارات:\n\nN = إضافة\nS = مادة جديدة\nT = تبديل الوضع\nP = بومودورو\nM = كتم\nK = بحث\nEsc = إغلاق');
});

/* ============ SPLASH ============ */
(function(){
  var splash = document.getElementById('splashScreen');
  var canvas = document.getElementById('splashCanvas');
  if(!splash || !canvas) return;
  var ctx = canvas.getContext('2d');
  var particles = [];
  var count = window.innerWidth < 768 ? 30 : 60;
  var dpr = window.devicePixelRatio || 1;

  function resize(){
    var w = window.innerWidth, h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);
    initP();
  }

  function initP(){
    particles = [];
    var w = window.innerWidth, h = window.innerHeight;
    for(var i = 0; i < count; i++){
      particles.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 2.5 + 0.5,
        alpha: Math.random() * 0.6 + 0.2,
        pulse: Math.random() * Math.PI * 2
      });
    }
  }

  function draw(){
    var w = window.innerWidth, h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);
    particles.forEach(function(p){
      p.x += p.vx; p.y += p.vy; p.pulse += 0.03;
      if(p.x < 0 || p.x > w) p.vx *= -1;
      if(p.y < 0 || p.y > h) p.vy *= -1;
      var pa = p.alpha + Math.sin(p.pulse) * 0.3;
      var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      g.addColorStop(0, 'rgba(255,122,0,' + pa + ')');
      g.addColorStop(1, 'rgba(255,122,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
      ctx.fill();
    });
    for(var i = 0; i < particles.length; i++){
      for(var j = i + 1; j < particles.length; j++){
        var dx = particles[i].x - particles[j].x;
        var dy = particles[i].y - particles[j].y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if(dist < 120){
          ctx.strokeStyle = 'rgba(255,122,0,' + (1 - dist/120) * 0.15 + ')';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  resize();
  draw();
  window.addEventListener('resize', resize);

  function playRising(){
    try{
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if(!AudioCtx) return;
      var ac = new AudioCtx();
      var mg = ac.createGain();
      mg.connect(ac.destination);
      mg.gain.setValueAtTime(0.15, ac.currentTime);
      mg.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 1.0);
      [523.25, 659.25, 783.99].forEach(function(f, i){
        var o = ac.createOscillator();
        var g = ac.createGain();
        o.connect(g); g.connect(mg);
        o.type = 'sine';
        o.frequency.setValueAtTime(f, ac.currentTime + i * 0.15);
        var st = ac.currentTime + i * 0.15;
        g.gain.setValueAtTime(0, st);
        g.gain.linearRampToValueAtTime(0.4, st + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, st + 0.5);
        o.start(st); o.stop(st + 0.5);
      });
    }catch(e){}
  }

  var played = false;
  function tryPlay(){ if(played) return; played = true; playRising(); }
  setTimeout(tryPlay, 400);
  document.addEventListener('click', tryPlay, {once: true});
  document.addEventListener('touchstart', tryPlay, {once: true});

  setTimeout(function(){
    splash.classList.add('hide');
    setTimeout(function(){ if(splash.parentNode) splash.parentNode.removeChild(splash); }, 700);
  }, 3000);
})();

/* ============ INIT ============ */
document.addEventListener('DOMContentLoaded', function(){
  loadSettings();
  applyTheme();
  renderStreak();
  updateTasksBadge();

  if(localStorage.getItem('sidebar_collapsed') === 'true'){
    var sb2 = document.getElementById('sidebar');
    if(sb2) sb2.classList.add('collapsed');
  }

  updateTimeWallpaper();
  setInterval(updateTimeWallpaper, 30 * 60 * 1000);
  setInterval(autoTheme, 60000);
});

console.log('%c🟠 مِذكَرتي v3.0', 'color:#FF7A00;font-size:18px;font-weight:bold');
console.log('%cاختصارات: N, S, T, P, M, K, ?', 'color:#FF7A00;font-size:12px');
