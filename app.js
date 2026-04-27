(function () {
  const ALERT_LIFETIME_MS = 10000;
  const FACULTY_PLACEHOLDER = "Выберите факультет";
  const POOL_SHEET_ID = "11yaPysnuMfkXtwvZSOOohogKnvT0py7rWuKNyAs5ud8";
  const POOL_INDEX_GID = 887181046;
  const POOL_DAYS = [
    "Понедельник",
    "Вторник",
    "Среда",
    "Четверг",
    "Пятница",
    "Суббота",
    "Воскресенье",
  ];
  const POOL_FALLBACK_SCHEDULES = {
    big: "./fallback/pool-big.csv",
    small: "./fallback/pool-small.csv",
  };
  const POOL_INLINE_FALLBACK_CSV = {
    big: `День,Дорожка,08:00 - 08:45,09:00 - 09:45,10:00 - 10:45,18:00 - 18:45,19:00 - 19:45
Понедельник,,,,,,
,1,Тренировка,,,Секция,
,2,,Школа,,,Занято
,3,,,,,
,4,Аренда,,,Группа,
,5,,,,,
,6,,Занято,,,,
Вторник,,,,,,
,1,,,,,
,2,,Группа,,,Секция,
,3,,,,,
,4,Тренировка,,Занято,,
,5,,,,,
,6,,,Школа,,
Среда,,,,,,
,1,,Группа,,,,
,2,,,,,
,3,Аренда,,,Секция,
,4,,,,,
,5,,Занято,,Группа,
,6,,,,,
Четверг,,,,,,
,1,,,,,
,2,Тренировка,,,Занято,
,3,,,,,
,4,,Группа,,,
,5,,,,,
,6,,,Секция,,
Пятница,,,,,,
,1,,Школа,,,
,2,,,,,
,3,Аренда,,,Группа,
,4,,,,,
,5,,Занято,,,Секция
,6,,,,,
Суббота,,,,,,
,1,,,,,
,2,,Секция,,,
,3,,,,,
,4,,,Группа,,
,5,,,,,
,6,Аренда,,,,
Воскресенье,,,,,,
,1,,Группа,,,
,2,,,,,
,3,,,Секция,,
,4,,,,,
,5,Аренда,,,,
,6,,,,,`,
    small: `День,Дорожка,07:30 - 08:15,08:30 - 09:15,17:00 - 17:45,18:00 - 18:45
Понедельник,,,,,
,1,Занято,,Секция,
,2,,,,
,3,,Группа,,
,4,,,,
Вторник,,,,,
,1,,,,
,2,Секция,,,Занято
,3,,,,
,4,,Группа,,
Среда,,,,,
,1,,Занято,,
,2,,,,
,3,Секция,,,
,4,,,,
Четверг,,,,,
,1,,,,
,2,,Группа,,
,3,,,,
,4,Секция,,,Занято
Пятница,,,,,
,1,,Группа,,
,2,,,,
,3,Занято,,Секция,
,4,,,,
Суббота,,,,,
,1,,,,
,2,Секция,,,
,3,,,,
,4,,Группа,,
Воскресенье,,,,,
,1,,Занято,,
,2,,,,
,3,,,,
,4,Секция,,,`,
  };
  const DOCUMENT_TYPES = [
    { title: "Студенческий билет", image: "./documents/student-card.svg" },
    { title: "Пропуск в корпус", image: "./documents/campus-pass.svg" },
    { title: "Пропуск в общежитие", image: "./documents/dorm-pass.svg" },
    { title: "Зачётная книжка", image: "./documents/gradebook.svg" },
    { title: "Старый абонемент", image: "./documents/old-membership.svg" },
  ];

  const state = {
    initData: "",
    apiBaseUrl: "",
    loading: true,
    savingProfile: false,
    uploadingDocument: false,
    uploadingPhoto: false,
    submittingReview: false,
    previewLoading: false,
    creatingApplication: false,
    cancellingApplicationId: null,
    deletingProfile: false,
    session: null,
    activeTab: "home",
    profileForm: { full_name: "", faculty: "", group_name: "" },
    fieldErrors: {},
    confirmApplication: null,
    confirmProfileSave: false,
    debugToday: "",
    showDeleteConfirm: false,
    showDocumentHelp: false,
    membershipModalOpen: false,
    membershipSecondsLeft: 15,
    alerts: [],
    theme: localStorage.getItem("theme") || "dark",
    adminList: [],
    adminApplications: [],
    adminQueue: [],
    pendingReviews: [],
    selectedReviewUserIds: [],
    selectedQueueApplicationIds: [],
    rejectReasonDialogUserIds: [],
    rejectCustomReason: "",
    adminExportPeriods: [],
    loadingAdmins: false,
    loadingAdminApplications: false,
    loadingAdminQueue: false,
    loadingPendingReviews: false,
    loadingAdminExportPeriods: false,
    managingAdmin: false,
    verifyingUser: false,
    issuingMembershipId: null,
    sendingBroadcast: false,
    broadcastText: "",
    broadcastImageFile: null,
    maintenanceSaving: false,
    maintenanceEnabled: false,
    maintenanceMessage: "",
    primaryAdminId: "",
    newAdminId: "",
    confirmRemoveAdminId: "",
    adminStatusFilter: "queued",
    adminDirectoryCategory: "applications",
    adminExportPeriod: "",
    adminQueueDirectionFilter: "all",
    adminQueueMonthFilter: "all",
    adminQueueFacultyFilter: "all",
    queueLimitGym: "",
    queueLimitPool: "",
    savingQueueLimits: false,
    scheduleEntryPoint: null,
    poolScheduleIndex: [],
    poolScheduleParsed: {},
    poolScheduleDay: null,
    poolSchedulePool: "big",
    poolScheduleMinFreeLanes: 0,
    loadingSchedule: false,
    scheduleError: "",
  };

  const content = document.getElementById("content");
  const alerts = document.getElementById("alerts");
  let membershipTimerId = null;
  let poolIndexPromise = null;
  let adminDataPromise = null;

  function initTheme() {
    document.documentElement.setAttribute("data-theme", state.theme);
  }

  function toggleTheme() {
    const themes = ["dark", "light"];
    const currentIndex = themes.indexOf(state.theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    state.theme = themes[nextIndex];
    localStorage.setItem("theme", state.theme);
    applyTheme();
    render();
  }

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.theme === "light" ? "light" : "dark");
  }

  function getThemeIcon() {
    if (state.theme === "dark") return "🌙";
    return "☀️";
  }

  function getScheduleTitle() {
    return `Расписание бассейна на ${new Date().toLocaleString("ru-RU", {
      month: "long",
      year: "numeric",
    }).replace(/^./, (char) => char.toUpperCase())}`;
  }

  function getWebApp() {
    return window.MAX?.WebApp || window.WebApp || window.Telegram?.WebApp || null;
  }

  function getQueryInitData() {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const hashParams = new URLSearchParams(hash);
    return (params.get("initData")|| params.get("InitData")|| params.get("WebAppData")|| params.get("webAppData")|| params.get("webappdata")|| params.get("tgWebAppData")|| hashParams.get("initData")|| hashParams.get("InitData")|| hashParams.get("WebAppData")|| hashParams.get("webAppData")|| hashParams.get("webappdata")|| hashParams.get("tgWebAppData")|| ""
    ).trim();
  }

  function getWindowInitData() {
    const candidates = [window.MAX?.WebApp?.initData,window.MAX?.WebApp?.InitData,window.MAX?.initData,window.MAX?.InitData,window.WebApp?.initData,window.WebApp?.InitData,window.Telegram?.WebApp?.initData,window.Telegram?.WebApp?.InitData,
    ];

    for (const candidate of candidates) {if (typeof candidate === "string" && candidate.trim()) {  return candidate.trim();}
    }

    return "";
  }

  function getInitData() {
    const webApp = getWebApp();
    if (webApp?.ready) {try {  webApp.ready();} catch (error) {  console.warn("MAX WebApp ready() failed", error);}
    }
    if (webApp?.expand) {try {  webApp.expand();} catch (error) {  console.warn("MAX WebApp expand() failed", error);}
    }

    const initData =getWindowInitData()|| (typeof webApp?.webAppData === "string" ? webApp.webAppData.trim() : "")|| getQueryInitData();

    return String(initData || "").trim();
  }

  function collectInitDataDiagnostics() {
    const webApp = getWebApp();
    return {hasMaxObject: Boolean(window.MAX),hasWebAppObject: Boolean(window.WebApp),hasBridgeWebApp: Boolean(webApp),bridgeKeys: webApp ? Object.keys(webApp).slice(0, 12) : [],searchParams: Array.from(new URLSearchParams(window.location.search).keys()),hashParams: Array.from(new URLSearchParams(window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash).keys()),location: window.location.href,
    };
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function resolveInitData() {
    const initData = getInitData();
    if (initData) {return initData;
    }

    for (const delayMs of [150, 350, 700]) {await sleep(delayMs);const retriedInitData = getInitData();if (retriedInitData) {  return retriedInitData;}
    }

    return "";
  }

  function isConfigured() {
    return Boolean(state.apiBaseUrl && !state.apiBaseUrl.includes("__"));
  }

  function buildApiHeaders(extra = {}) {
    return { ...extra };
  }

  function buildPayload(extra = {}) {
    return {initData: state.initData,...(state.debugToday ? { debug_today: state.debugToday } : {}),...extra,
    };
  }

  function describeFetchFailure(path, error) {
    const targetUrl = `${state.apiBaseUrl}${path}`;
    const host = (() => {try {  return new URL(targetUrl).host;} catch (_) {  return targetUrl;}
    })();
    const online = typeof navigator.onLine === "boolean" ? navigator.onLine : true;
    const reason = error?.message ? String(error.message) : "Network request failed";

    return new Error(online  ? `Не удалось подключиться к ${host}. Сеть в mini-app недоступна или запрос блокируется webview. Исходная ошибка: ${reason}`  : `Устройство сейчас офлайн. Не удалось подключиться к ${host}.`,
    );
  }

  async function apiPost(path, payload) {
    let response;
    try {response = await fetch(`${state.apiBaseUrl}${path}`, {  method: "POST",  headers: buildApiHeaders({ "Content-Type": "application/json; charset=utf-8" }),  body: JSON.stringify(payload),});
    } catch (error) {throw describeFetchFailure(path, error);
    }
    const raw = await response.text();
    if (!response.ok) {throw new Error(raw || `HTTP ${response.status}`);
    }
    return raw ? JSON.parse(raw) : null;
  }

  async function apiMultipart(path, formData) {
    let response;
    try {response = await fetch(`${state.apiBaseUrl}${path}`, {  method: "POST",  headers: buildApiHeaders(),  body: formData,});
    } catch (error) {throw describeFetchFailure(path, error);
    }
    const raw = await response.text();
    if (!response.ok) {throw new Error(raw || `HTTP ${response.status}`);
    }
    return raw ? JSON.parse(raw) : null;
  }

  function parseApiErrorMessage(error) {
    const message = String(error?.message || error || "");
    try {
      return JSON.parse(message);
    } catch (_) {
      return { message };
    }
  }

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  }

  function monthLabel(year, month) {
    return `${String(month).padStart(2, "0")}.${year}`;
  }

  function ensureAdminExportPeriod() {
    if (state.adminExportPeriod) return;
    const first = state.adminExportPeriods[0];
    if (first) {
      state.adminExportPeriod = `${first.year}-${String(first.month).padStart(2, "0")}`;
      return;
    }
    const source = state.adminApplications[0] || state.adminQueue[0] || getActiveApplication();
    if (source?.target_year && source?.target_month) {
      state.adminExportPeriod = `${source.target_year}-${String(source.target_month).padStart(2, "0")}`;
    }
  }

  function fullMonthLabel(year, month) {
    return new Date(year, month - 1, 1).toLocaleDateString("ru-RU", {
      month: "long",
      year: "numeric",
    });
  }

  function membershipNumber(application) {
    if (!application?.id) return "000000";
    return String(application.id).padStart(6, "0");
  }

  function verificationLabel(status) {
    switch (status) {case "approved":  return { text: "Профиль подтверждён", className: "approved" };case "pending":  return { text: "Профиль на проверке", className: "pending" };case "rejected":  return { text: "Профиль отклонён", className: "rejected" };default:  return { text: "Профиль не отправлен", className: "not_submitted" };
    }
  }

  function applicationStatusLabel(status) {
    switch (status) {case "issued":  return { text: "Выдан", className: "issued" };case "approved":  return { text: "Подтверждена", className: "approved" };case "cancelled":  return { text: "Заявка отменена", className: "rejected" };default:  return { text: "В очереди", className: "pending" };
    }
  }

  function getActiveApplication() {
    return (state.session?.applications || []).find((app) => app.status === "queued" || app.status === "approved" || app.status === "issued") || null;
  }

  function canPresentMembership() {
    const active = getActiveApplication();
    if (!active) return { ok: false, reason: "Сначала создайте заявку." };
    const today = state.session?.effective_today || new Date().toISOString().slice(0, 10);
    const assigned = `${active.target_year}-${String(active.target_month).padStart(2, "0")}-01`;
    if (today < assigned) {return { ok: false, reason: `Абонемент станет доступен с 01.${String(active.target_month).padStart(2, "0")}.${active.target_year}.` };
    }
    if (!state.session?.profile?.profile_photo_signed_url) {return { ok: false, reason: "Сначала загрузите фото профиля." };
    }
    return { ok: true };
  }

  function hasProfilePhoto() {
    return Boolean(!state.uploadingPhoto&& (state.session?.profile?.profile_photo_signed_url || state.session?.profile?.profile_photo_path || state.session?.profile?.profile_photo_url),
    );
  }

  function hasIdentityDocument() {
    const profile = state.session?.profile;
    return Boolean(!state.uploadingDocument&& profile?.identity_document_uploaded_at&& (profile?.identity_document_signed_url || profile?.identity_document_path || profile?.identity_document_url),
    );
  }

  function getProfileSetupItems(profile) {
    return [{  label: "Основные данные сохранены",  done: Boolean(profile?.full_name && profile?.faculty && profile?.group_name),},{  label: "Фото для абонемента загружено",  done: hasProfilePhoto(),},{  label: "Документ для проверки загружен",  done: hasIdentityDocument(),},{  label: "Профиль подтверждён",  done: profile?.verification_status === "approved",},
    ];
  }

  function getNextAction(profile, activeApplication, membershipAccess) {
    if (!profile) {return {  eyebrow: "Следующий шаг",  title: "Создайте профиль",  description: "Сохраните ФИО, факультет и группу, затем загрузите фото и документ.",  action: "switch-tab",  tab: "profile",  buttonLabel: "Перейти в профиль",};
    }

    if (profile.verification_status !== "approved") {const description = profile.verification_status === "pending"  ? "Профиль уже отправлен. Дождитесь проверки документов администратором."  : profile.verification_status === "rejected"    ? "Исправьте замечание администратора, обновите данные или документы и отправьте профиль снова."    : "Завершите шаги профиля и отправьте его на проверку, чтобы открыть заявки.";
return {  eyebrow: "Следующий шаг",  title: profile.verification_status === "pending" ? "Ожидайте проверку" : "Завершите профиль",  description,  action: "switch-tab",  tab: "profile",  buttonLabel: "Открыть профиль",};
    }

    if (!activeApplication) {return {  eyebrow: "Следующий шаг",  title: "Подайте заявку",  description: "Выберите спортзал или бассейн. Сначала увидите месяц и место в очереди, затем подтвердите запись.",  action: "switch-tab",  tab: "application",  buttonLabel: "Перейти к заявке",};
    }

    if (membershipAccess.ok) {return {  eyebrow: "Доступно сейчас",  title: "Абонемент готов",  description: "Откройте электронный абонемент и предъявите его на входе.",  action: "open-membership",  buttonLabel: "Предъявить абонемент",};
    }

    return {eyebrow: "Статус абонемента",title: "Абонемент пока недоступен",description: membershipAccess.reason,action: "switch-tab",tab: "application",buttonLabel: "Посмотреть заявку",
    };
  }

  function renderReadinessCard(profile, title, note = "") {
    const items = getProfileSetupItems(profile);
    const completed = items.filter((item) => item.done).length;
    const percent = Math.round((completed / items.length) * 100);

    return `<section class="card card--wide readiness-card">  <div class="readiness-card__header">    <div>      <p class="card__eyebrow">Готовность</p>      <h3>${escapeHtml(title)}</h3>    </div>    <div class="readiness-card__score">      <strong>${completed}/${items.length}</strong>      <span>шагов</span>    </div>  </div>  <div class="progress-meter" aria-label="Готовность профиля ${completed} из ${items.length}">    <div class="progress-meter__track">      <div class="progress-meter__fill" style="width:${percent}%"></div>    </div>    <span class="progress-meter__text">${percent}% готовности</span>  </div>  <div class="checklist">    ${items.map((item, index) => `      <div class="checklist__item ${item.done ? "checklist__item--done" : ""}">        <span class="checklist__mark">${item.done ? "OK" : index + 1}</span>        <span>${escapeHtml(item.label)}</span>      </div>    `).join("")}  </div>  ${note ? `<p class="section-note">${escapeHtml(note)}</p>` : ""}</section>
    `;
  }

  function renderNextActionCard(profile, activeApplication, membershipAccess) {
    const nextAction = getNextAction(profile, activeApplication, membershipAccess);
    if (!profile && state.activeTab === "profile") {
      return "";
    }
    const actionAttributes = nextAction.action === "switch-tab"? `data-action="switch-tab" data-tab="${escapeHtml(nextAction.tab)}"`: `data-action="${escapeHtml(nextAction.action)}"`;

    return `<article class="card action-card">  <p class="card__eyebrow">${escapeHtml(nextAction.eyebrow)}</p>  <h3>${escapeHtml(nextAction.title)}</h3>  <p>${escapeHtml(nextAction.description)}</p>  <div class="actions">    <button class="btn-primary" ${actionAttributes}>${escapeHtml(nextAction.buttonLabel)}</button>  </div></article>
    `;
  }

  function renderProfileStatusSection(profile, verification, activeApplication, membershipAccess) {
    return `<section class="cards-grid">  <article class="card card--accent">    <p class="card__eyebrow">Статус</p>    <h2>${profile ? escapeHtml(profile.full_name) : "Новый студент"}</h2>    ${state.session?.user_id ? `<p class="section-note">MAX ID: <strong>${escapeHtml(state.session.user_id)}</strong></p>` : ""}    <p>${profile ? "Профиль сохранён. Здесь можно обновить данные, фото и документ." : "Сначала заполните профиль, затем загрузите фото и документ для проверки."}</p>    <div class="status-chip ${escapeHtml(verification.className)}">${escapeHtml(verification.text)}</div>    ${profile?.verification_comment ? `<p class="section-note">${escapeHtml(profile.verification_comment)}</p>` : ""}    ${profile ? "" : `<div class="actions"><button class="btn-primary" data-action="switch-tab" data-tab="profile">Заполнить профиль</button></div>`}  </article>  ${renderNextActionCard(profile, activeApplication, membershipAccess)}</section>`;
  }

  function renderApplicationAccessCard(profile) {
    if (profile?.verification_status === "approved") {
      return `<section class="card">  <p class="card__eyebrow">Готовность к подаче</p>  <h3>Заявку можно подать</h3>  <p>Профиль подтверждён. Выберите направление и посмотрите ближайший доступный месяц.</p></section>`;
    }

    const message = !profile
      ? "Сначала заполните профиль и загрузите необходимые документы."
      : profile.verification_status === "pending"
        ? "Профиль уже отправлен. Дождитесь проверки, после этого можно будет подать заявку."
        : profile.verification_status === "rejected"
          ? "Профиль нужно исправить и отправить повторно. Пока он не подтверждён, подача заявки недоступна."
          : "Профиль ещё не подтверждён. Завершите подготовку в разделе «Профиль».";

    return `<section class="card">  <p class="card__eyebrow">Готовность к подаче</p>  <h3>Подача пока недоступна</h3>  <p>${escapeHtml(message)}</p>  <div class="actions">    <button class="btn-secondary" data-action="switch-tab" data-tab="profile">Открыть профиль</button>  </div></section>`;
  }

  function renderCurrentApplicationCard(activeApplication) {
    const streak = state.session?.streaks?.application_streak || 0;
    if (!activeApplication) {
      return `<section class="card">  <p class="card__eyebrow">Текущая заявка</p>  <h3>Заявки пока нет</h3>  <p>Когда вы выберете направление и подтвердите запись, здесь появятся месяц, очередь и статус.</p>  ${streak ? `<p class="section-note">Серия без пропусков: <strong>${escapeHtml(String(streak))}</strong></p>` : ""}</section>`;
    }

    const status = applicationStatusLabel(activeApplication.status);
    return `<section class="card card--wide">  <p class="card__eyebrow">Текущая заявка</p>  <h3>${activeApplication.direction === "gym" ? "Спортзал" : "Бассейн"}</h3>  <div class="application__meta">    <span>Месяц: ${escapeHtml(monthLabel(activeApplication.target_year, activeApplication.target_month))}</span>    <span>Статус: <span class="status-chip ${escapeHtml(status.className)}">${escapeHtml(status.text)}</span></span>    <span>Место в очереди: ${escapeHtml(activeApplication.queue_position)}</span>    <span>Серия: ${escapeHtml(String(streak || 1))}</span>  </div>  <div class="application__footer">    ${(activeApplication.status === "queued" || activeApplication.status === "approved") ? `      <button class="btn-danger" data-action="cancel-application" data-id="${escapeHtml(activeApplication.id)}" ${state.cancellingApplicationId === activeApplication.id ? "disabled" : ""}>        ${state.cancellingApplicationId === activeApplication.id ? "Отменяем..." : "Отменить заявку"}      </button>    ` : ""}  </div></section>`;
  }

  function renderApplicationHistoryCard(applications) {
    const streaks = state.session?.streaks || {};
    return `<section class="card card--wide">  <p class="card__eyebrow">История заявок</p>  <h3>Шаг, очередь и статус</h3>  <p class="section-note">Серия заявок без пропусков: <strong>${escapeHtml(String(streaks.application_streak || 0))}</strong>. Серия выданных абонементов: <strong>${escapeHtml(String(streaks.issued_streak || 0))}</strong>.</p>  <div class="application-list">    ${applications.length      ? applications.map((application) => {          const status = applicationStatusLabel(application.status);          return `            <article class="application">              <strong>${application.direction === "gym" ? "Подать заявку: спортзал" : "Подать заявку: бассейн"}</strong>              <div class="application__meta">                <span>Месяц: ${escapeHtml(monthLabel(application.target_year, application.target_month))}</span>                <span>Очередь: ${escapeHtml(application.queue_position)}</span>                <span>Статус: <span class="status-chip ${escapeHtml(status.className)}">${escapeHtml(status.text)}</span></span>              </div>            </article>          `;        }).join("")      : '<div class="empty-state">Истории заявок пока нет.</div>'}  </div></section>`;
  }

  function renderMembershipSummaryCard(profile, activeApplication, membershipAccess) {
    const issuedStreak = state.session?.streaks?.issued_streak || 0;
    if (membershipAccess.ok) {
      return `<section class="card card--wide">  <p class="card__eyebrow">Текущий абонемент</p>  <h3>Абонемент активен</h3>  <p>Абонемент оформлен на ${escapeHtml(monthLabel(activeApplication.target_year, activeApplication.target_month))}. Его можно открыть и предъявить на входе.</p>  <p class="section-note">Серия выданных абонементов: <strong>${escapeHtml(String(issuedStreak || 1))}</strong></p>  <div class="actions">    <button class="btn-primary" data-action="open-membership">Предъявить абонемент</button>  </div></section>`;
    }

    if (activeApplication) {
      return `<section class="card card--wide">  <p class="card__eyebrow">Текущий абонемент</p>  <h3>Абонемент пока недоступен</h3>  <p>${escapeHtml(membershipAccess.reason)}</p></section>`;
    }

    return `<section class="card card--wide">  <p class="card__eyebrow">Текущий абонемент</p>  <h3>Активного абонемента пока нет</h3>  <p>${profile?.verification_status === "approved" ? "Сначала подайте заявку в разделе «Заявка». После подтверждения месяца абонемент появится здесь." : "Сначала подготовьте и подтвердите профиль, затем подайте заявку."}</p></section>`;
  }

  function closeMembership() {
    state.membershipModalOpen = false;
    state.membershipSecondsLeft = 15;
    if (membershipTimerId) {clearInterval(membershipTimerId);membershipTimerId = null;
    }
  }

  function startMembershipTimer() {
    if (membershipTimerId) {clearInterval(membershipTimerId);
    }

    const expiresAt = Date.now() + 15000;
    state.membershipSecondsLeft = 15;
    membershipTimerId = setInterval(() => {const secondsLeft = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));if (state.membershipSecondsLeft !== secondsLeft) {  state.membershipSecondsLeft = secondsLeft;  render();}if (secondsLeft <= 0) {  closeMembership();  render();}
    }, 250);
  }

  function pushAlert(kind, title, body) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    state.alerts = [{ id, kind, title, body }];
    renderAlerts();
    window.setTimeout(() => dismissAlert(id), ALERT_LIFETIME_MS);
  }

  function dismissAlert(id) {
    const next = state.alerts.filter((item) => item.id !== id);
    if (next.length !== state.alerts.length) {state.alerts = next;renderAlerts();
    }
  }

  function renderAlerts() {
    alerts.innerHTML = state.alerts.map((item) => `<article class="alert alert--${escapeHtml(item.kind)}">  <div class="alert__header">    <div>      <strong class="alert__title">${escapeHtml(item.title)}</strong>      <div class="alert__body">${escapeHtml(item.body)}</div>    </div>    <button class="alert__close" data-action="dismiss-alert" data-id="${escapeHtml(item.id)}" aria-label="Закрыть уведомление">×</button>  </div>  <div class="alert__timer">    <div class="alert__timer-bar" style="animation-duration:${ALERT_LIFETIME_MS}ms"></div>  </div></article>
    `).join("");
  }

  function fillProfileForm(profile) {
    state.profileForm = {full_name: profile?.full_name || "",faculty: profile?.faculty || "",group_name: profile?.group_name || "",
    };
  }

  function validateProfileForm() {
    const errors = {};
    const fullName = state.profileForm.full_name.trim();
    const groupName = state.profileForm.group_name.trim().toUpperCase();
    if (fullName.split(/\s+/).filter(Boolean).length < 2) {errors.full_name = "Введите полное ФИО.";
    }
    if (!state.profileForm.faculty) {errors.faculty = "Выберите факультет.";
    }
    if (!/^[А-ЯA-Z0-9]+-\d{2,4}$/i.test(groupName)) {errors.group_name = "Группа должна быть в формате БИСТ-312.";
    }
    state.fieldErrors = errors;
    return Object.keys(errors).length === 0;
  }

  function hasApprovedProfileChanges() {
    const profile = state.session?.profile;
    if (!profile || profile.verification_status !== "approved") {
      return false;
    }
    return profile.full_name !== state.profileForm.full_name.trim()
      || profile.faculty !== state.profileForm.faculty
      || profile.group_name !== state.profileForm.group_name.trim().toUpperCase();
  }

  async function loadSession() {
    state.loading = true;
    render();
    try {
      state.session = await apiPost("/session", buildPayload());
      state.debugToday = state.session.debug_today || "";
      state.maintenanceEnabled = Boolean(state.session.maintenance_enabled);
      state.maintenanceMessage = String(state.session.maintenance_message || "");
      fillProfileForm(state.session.profile);
      if (state.session.is_admin && state.activeTab === "admin") {
        await ensureAdminDataLoaded();
      }
      if (state.activeTab === "home" && !state.poolScheduleDay && !state.loadingSchedule) {
        state.scheduleEntryPoint = "pool";
        void ensurePoolScheduleLoaded();
      }
    } catch (error) {
      const parsed = parseApiErrorMessage(error);
      if (parsed.code === "subscription_required") {
        state.session = {
          subscription_ok: false,
          missing_required_channels: parsed.missing_required_channels || [],
          is_admin: false,
          maintenance_enabled: false,
        };
      } else if (parsed.code === "subscription_check_unavailable") {
        pushAlert("error", "Проверка подписок недоступна", parsed.message || "Попробуйте позже.");
      } else {
        pushAlert("error", "Не удалось загрузить данные", parsed.message || String(error.message || error));
      }
    } finally {
      state.loading = false;
      render();
    }
  }


  async function saveProfile() {
    state.fieldErrors = {};
    if (!validateProfileForm()) {
      render();
      return;
    }
    if (hasApprovedProfileChanges() && !state.confirmProfileSave) {
      state.confirmProfileSave = true;
      render();
      return;
    }
    const wasApproved = state.session?.profile?.verification_status === "approved";
    state.savingProfile = true;
    render();
    try {
      const result = await apiPost("/profile", buildPayload({
        full_name: state.profileForm.full_name,
        faculty: state.profileForm.faculty,
        group_name: state.profileForm.group_name,
      }));
      state.session.profile = result.profile;
      state.profileForm = {
        full_name: result.profile.full_name || "",
        faculty: result.profile.faculty || "",
        group_name: result.profile.group_name || "",
      };
      state.confirmProfileSave = false;
      if (wasApproved && result.profile?.verification_status === "not_submitted") {
        pushAlert("success", "Профиль сохранён", "Данные обновлены. Статус профиля сброшен на «не подтверждено», отправьте профиль на повторную проверку.");
      } else {
        pushAlert("success", "Профиль сохранён", "Данные профиля успешно обновлены.");
      }
    } catch (error) {
      const message = String(error.message || error);
      if (message.includes("ФИО")) {
        state.fieldErrors.full_name = message;
      } else if (message.includes("факультет")) {
        state.fieldErrors.faculty = message;
      } else if (message.includes("груп")) {
        state.fieldErrors.group_name = message;
      } else {
        pushAlert("error", "Не удалось сохранить профиль", message);
      }
    } finally {
      state.savingProfile = false;
      render();
    }
  }

  async function uploadProfilePhoto(file) {
    if (!state.session?.profile) {
      pushAlert("error", "Сначала сохраните профиль", "Для загрузки фото сначала заполните основные данные профиля.");
      return;
    }
    state.uploadingPhoto = true;
    render();
    try {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("Размер файла не должен превышать 10 МБ.");
      }
      if (!file.type.startsWith("image/")) {
        throw new Error("Нужно загрузить файл изображения.");
      }

      const formData = new FormData();
      formData.append("initData", state.initData);
      formData.append("photo", file);

      const result = await apiMultipart("/profile/photo", formData);
      state.session.profile = result.profile;
      pushAlert("success", "Фото загружено", "Фото профиля успешно сохранено.");
    } catch (error) {
      const message = String(error.message || error);
      if (message.includes("timeout") || message.includes("Load failed")) {
        pushAlert("error", "Не удалось загрузить фото", "Попробуйте загрузить файл меньшего размера или повторите попытку позже.");
      } else {
        pushAlert("error", "Не удалось загрузить фото", message);
      }
    } finally {
      state.uploadingPhoto = false;
      render();
    }
  }

  async function uploadDocument(file) {
    if (!state.session?.profile) {
      pushAlert("error", "Сначала сохраните профиль", "Сначала сохраните ФИО, факультет и группу.");
      return;
    }
    state.uploadingDocument = true;
    render();
    try {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("Размер файла не должен превышать 10 МБ.");
      }
      if (!file.type.startsWith("image/")) {
        throw new Error("Нужно загрузить файл изображения.");
      }

      const formData = new FormData();
      formData.append("initData", state.initData);
      formData.append("document", file);

      const result = await apiMultipart("/profile/document", formData);
      state.session.profile = result.profile;
      pushAlert("success", "Документ загружен", "Документ для проверки успешно сохранён.");
    } catch (error) {
      const message = String(error.message || error);
      if (message.includes("timeout") || message.includes("Load failed")) {
        pushAlert("error", "Не удалось загрузить документ", "Попробуйте загрузить файл меньшего размера или повторите попытку позже.");
      } else {
        pushAlert("error", "Не удалось загрузить документ", message);
      }
    } finally {
      state.uploadingDocument = false;
      render();
    }
  }
  async function submitReview() {
    if (!hasProfilePhoto() || !hasIdentityDocument()) {
      pushAlert("error", "Профиль не готов к отправке", "Сначала дождитесь успешной загрузки фото профиля и документа.");
      return;
    }
    state.submittingReview = true;
    render();
    try {
      const result = await apiPost("/profile/submit-review", buildPayload());
      state.session.profile = result.profile;
      pushAlert("success", "Профиль отправлен на проверку", "Администратор проверит фото профиля и документ. Результат придёт в чат бота.");
    } catch (error) {
      pushAlert("error", "Профиль не отправлен", error.message || "Повторите попытку позже.");
    } finally {
      state.submittingReview = false;
      render();
    }
  }

  async function loadAdminList() {
    if (!state.session?.is_admin) return;
    state.loadingAdmins = true;
    render();
    try {
      const result = await apiPost("/admin/list-admins", buildPayload());
      state.adminList = result.admins || [];
      state.primaryAdminId = result.primary_admin_id || "";
    } catch (error) {
      pushAlert("error", "Ошибка загрузки", error.message || "Не удалось загрузить список админов.");
    } finally {
      state.loadingAdmins = false;
      render();
    }
  }

  async function loadAdminApplications() {
    if (!state.session?.is_admin) return;
    state.loadingAdminApplications = true;
    render();
    try {
      const result = await apiPost("/admin/applications", buildPayload({ status: state.adminStatusFilter || "queued" }));
      state.adminApplications = result.applications || [];
    } catch (error) {
      pushAlert("error", "Ошибка загрузки", error.message || "Не удалось загрузить заявки.");
    } finally {
      state.loadingAdminApplications = false;
      render();
    }
  }

  async function loadAdminQueue() {
    if (!state.session?.is_admin) return;
    state.loadingAdminQueue = true;
    render();
    try {
      const result = await apiPost("/admin/queue", buildPayload());
      state.adminQueue = result.applications || [];
    } catch (error) {
      pushAlert("error", "Ошибка загрузки", error.message || "Не удалось загрузить очередь.");
    } finally {
      state.loadingAdminQueue = false;
      render();
    }
  }

  async function loadPendingReviews() {
    if (!state.session?.is_admin) return;
    state.loadingPendingReviews = true;
    render();
    try {
      const result = await apiPost("/admin/pending-reviews", buildPayload());
      state.pendingReviews = result.users || [];
    } catch (error) {
      pushAlert("error", "Ошибка загрузки", error.message || "Не удалось загрузить профили на проверке.");
    } finally {
      state.loadingPendingReviews = false;
      render();
    }
  }

  async function loadAdminExportPeriods() {
    if (!state.session?.is_admin) return;
    state.loadingAdminExportPeriods = true;
    render();
    try {
      const result = await apiPost("/admin/export-periods", buildPayload());
      state.adminExportPeriods = result.periods || [];
      ensureAdminExportPeriod();
    } catch (error) {
      pushAlert("error", "Ошибка загрузки", error.message || "Не удалось загрузить периоды выгрузки.");
    } finally {
      state.loadingAdminExportPeriods = false;
      render();
    }
  }

  async function loadAdminQueueLimits() {
    if (!state.session?.is_admin) return;
    try {
      const result = await apiPost("/admin/queue-limits", buildPayload());
      state.queueLimitGym = String(result.limits?.gym || "");
      state.queueLimitPool = String(result.limits?.pool || "");
      render();
    } catch (error) {
      pushAlert("error", "Ошибка загрузки", error.message || "Не удалось загрузить лимиты очереди.");
    }
  }

  async function ensureAdminDataLoaded(force = false) {
    if (!state.session?.is_admin) return;
    if (adminDataPromise && !force) {
      await adminDataPromise;
      return;
    }
    adminDataPromise = Promise.all([
      loadAdminList(),
      loadAdminApplications(),
      loadAdminQueue(),
      loadPendingReviews(),
      loadAdminExportPeriods(),
      loadAdminQueueLimits(),
    ]).finally(() => {
      adminDataPromise = null;
    });
    await adminDataPromise;
  }

  async function verifyUser(userId, status) {
    if (!state.session?.is_admin) return;
    const comment = status === "rejected" ? prompt("Причина отклонения:") : "";
    if (status === "rejected" && !comment) return;
    state.verifyingUser = true;
    render();
    try {
      await apiPost("/admin/verify-user", buildPayload({ user_id: userId, status, comment }));
      pushAlert("success", "Проверка завершена", status === "approved" ? "Профиль одобрен." : "Профиль отклонён.");
      await loadPendingReviews();
      await loadSession();
    } catch (error) {
      pushAlert("error", "Не удалось обновить статус", error.message || "Повторите попытку.");
    } finally {
      state.verifyingUser = false;
      render();
    }
  }

  async function verifyUsers(userIds, status, comment = "") {
    if (!state.session?.is_admin || !userIds.length) return;
    state.verifyingUser = true;
    render();
    try {
      await apiPost("/admin/verify-users", buildPayload({ user_ids: userIds, status, comment }));
      pushAlert("success", "Проверка завершена", status === "approved" ? "Профили одобрены." : "Профили отклонены.");
      state.selectedReviewUserIds = [];
      state.rejectReasonDialogUserIds = [];
      state.rejectCustomReason = "";
      await loadPendingReviews();
      await loadSession();
    } catch (error) {
      pushAlert("error", "Не удалось обновить статусы", error.message || "Повторите попытку.");
    } finally {
      state.verifyingUser = false;
      render();
    }
  }

  async function deleteUsers(userIds) {
    if (!state.session?.is_admin || !userIds.length) return;
    state.managingAdmin = true;
    render();
    try {
      await apiPost("/admin/delete-users", buildPayload({ user_ids: userIds }));
      pushAlert("success", "Профили удалены", `Удалено профилей: ${userIds.length}.`);
      state.selectedReviewUserIds = [];
      await loadPendingReviews();
      await loadSession();
    } catch (error) {
      pushAlert("error", "Не удалось удалить профили", error.message || "Повторите попытку позже.");
    } finally {
      state.managingAdmin = false;
      render();
    }
  }

  async function issueMembership(applicationId) {
    if (!state.session?.is_admin) return;
    state.issuingMembershipId = applicationId;
    render();
    try {
      await apiPost("/admin/issue-membership", buildPayload({ application_id: applicationId }));
      pushAlert("success", "Абонемент выдан", "Статус заявки обновлён на выдано.");
      await Promise.all([loadAdminApplications(), loadAdminQueue(), loadSession()]);
    } catch (error) {
      pushAlert("error", "Не удалось выдать абонемент", error.message || "Повторите попытку позже.");
    } finally {
      state.issuingMembershipId = null;
      render();
    }
  }

  async function issueMembershipCurrent(applicationId) {
    if (!state.session?.is_admin) return;
    state.issuingMembershipId = applicationId;
    render();
    try {
      await apiPost("/admin/issue-membership-current", buildPayload({ application_id: applicationId }));
      pushAlert("success", "Абонемент выдан", "Заявка переведена на текущий месяц и выдана студенту.");
      state.selectedQueueApplicationIds = state.selectedQueueApplicationIds.filter((item) => Number(item) !== applicationId);
      await Promise.all([loadAdminApplications(), loadAdminQueue(), loadSession()]);
    } catch (error) {
      pushAlert("error", "Не удалось выдать на текущий", error.message || "Повторите попытку позже.");
    } finally {
      state.issuingMembershipId = null;
      render();
    }
  }

  async function adminCancelApplication(applicationId) {
    if (!state.session?.is_admin) return;
    state.cancellingApplicationId = applicationId;
    render();
    try {
      const result = await apiPost("/admin/cancel-application", buildPayload({ application_id: applicationId }));
      let message = "Заявка снята, пользователю отправлено уведомление в чат.";
      if (result.promoted_max_user_id) {
        message += " Следующий студент в очереди сдвинут и тоже получит уведомление.";
      }
      pushAlert("success", "Заявка отменена", message);
      state.selectedQueueApplicationIds = state.selectedQueueApplicationIds.filter((item) => Number(item) !== applicationId);
      await Promise.all([loadAdminApplications(), loadAdminQueue(), loadSession()]);
    } catch (error) {
      pushAlert("error", "Не удалось отменить заявку", error.message || "Повторите попытку позже.");
    } finally {
      state.cancellingApplicationId = null;
      render();
    }
  }

  async function issueMemberships(applicationIds) {
    if (!state.session?.is_admin || !applicationIds.length) return;
    state.issuingMembershipId = "bulk";
    render();
    try {
      await apiPost("/admin/issue-memberships", buildPayload({ application_ids: applicationIds }));
      state.selectedQueueApplicationIds = [];
      pushAlert("success", "Абонементы выданы", `Обновлено заявок: ${applicationIds.length}.`);
      await Promise.all([loadAdminApplications(), loadAdminQueue(), loadSession()]);
    } catch (error) {
      pushAlert("error", "Не удалось выдать абонементы", error.message || "Повторите попытку позже.");
    } finally {
      state.issuingMembershipId = null;
      render();
    }
  }

  async function sendBroadcast() {
    if (!state.session?.is_admin) return;
    const text = state.broadcastText.trim();
    if (!text) {
      pushAlert("error", "Введите текст", "Текст рассылки обязателен.");
      return;
    }
    state.sendingBroadcast = true;
    render();
    try {
      if (state.broadcastImageFile) {
        const formData = new FormData();
        formData.append("initData", state.initData);
        formData.append("text", text);
        formData.append("image", state.broadcastImageFile);
        await apiMultipart("/admin/broadcast-with-image", formData);
      } else {
        await apiPost("/admin/broadcast", buildPayload({ text, image_url: null }));
      }
      pushAlert("success", "Рассылка поставлена в очередь", "Сообщение будет отправлено всем пользователям бота.");
      state.broadcastText = "";
      state.broadcastImageFile = null;
    } catch (error) {
      pushAlert("error", "Не удалось запустить рассылку", error.message || "Повторите попытку позже.");
    } finally {
      state.sendingBroadcast = false;
      render();
    }
  }

  async function saveMaintenance() {
    if (!state.session?.is_admin) return;
    state.maintenanceSaving = true;
    render();
    try {
      await apiPost("/admin/maintenance", buildPayload({ enabled: state.maintenanceEnabled, message: state.maintenanceMessage }));
      pushAlert("success", "Режим обновлён", state.maintenanceEnabled ? "Техработы включены." : "Техработы выключены.");
      await loadSession();
    } catch (error) {
      pushAlert("error", "Не удалось обновить режим техработ", error.message || "Повторите попытку позже.");
    } finally {
      state.maintenanceSaving = false;
      render();
    }
  }

  async function saveQueueLimits() {
    if (!state.session?.is_admin) return;
    state.savingQueueLimits = true;
    render();
    try {
      const result = await apiPost("/admin/queue-limits/save", buildPayload({
        gym: state.queueLimitGym.trim(),
        pool: state.queueLimitPool.trim(),
      }));
      state.queueLimitGym = String(result.limits?.gym || "");
      state.queueLimitPool = String(result.limits?.pool || "");
      pushAlert("success", "Лимиты сохранены", "Длина очереди по направлениям обновлена.");
    } catch (error) {
      pushAlert("error", "Не удалось сохранить лимиты", error.message || "Повторите попытку позже.");
    } finally {
      state.savingQueueLimits = false;
      render();
    }
  }

  async function downloadAdminExport(direction) {
    try {
      ensureAdminExportPeriod();
      const [yearRaw, monthRaw] = String(state.adminExportPeriod || "").split("-");
      const exportYear = Number(yearRaw);
      const exportMonth = Number(monthRaw);
      if (!exportYear || !exportMonth || exportMonth < 1 || exportMonth > 12) {
        pushAlert("error", "Проверьте период", "Укажите корректные месяц и год для выгрузки.");
        return;
      }

      const result = await apiPost("/admin/export-to-chat", buildPayload({
        direction,
        year: exportYear,
        month: exportMonth,
      }));
      pushAlert("success", "Документ отправлен", `Файл ${result.filename || "списка"} отправлен вам в чат бота.`);
    } catch (error) {
      pushAlert("error", "Не удалось отправить список", error.message || "Повторите попытку позже.");
    }
  }

  function getFilteredAdminQueue() {
    return state.adminQueue.filter((item) => {
      if (state.adminQueueDirectionFilter !== "all" && item.direction !== state.adminQueueDirectionFilter) {
        return false;
      }
      if (state.adminQueueMonthFilter !== "all") {
        const itemPeriod = `${item.target_year}-${String(item.target_month).padStart(2, "0")}`;
        if (itemPeriod !== state.adminQueueMonthFilter) {
          return false;
        }
      }
      if (state.adminQueueFacultyFilter !== "all") {
        const faculty = item.user?.faculty || item.faculty || "";
        if (faculty !== state.adminQueueFacultyFilter) {
          return false;
        }
      }
      return true;
    });
  }

  function renderAdminQueueItem(item) {
    const user = item.user || {};
    const status = applicationStatusLabel(item.status);
    const photoUrl = item.profile_photo_signed_url || item.user?.profile_photo_url || item.profile_photo_url || "";
    return `<article class="application">  <label class="checkbox-row"><input type="checkbox" data-action="toggle-queue-application" data-application-id="${escapeHtml(item.id)}" ${state.selectedQueueApplicationIds.includes(String(item.id)) ? "checked" : ""}> <span>Выбрать заявку</span></label>  <strong>${escapeHtml(user.full_name || item.full_name || "—")}</strong>  <div class="admin-review-media">${photoUrl ? `<img class="admin-photo-thumb" src="${escapeHtml(photoUrl)}" alt="Фото профиля">` : `<div class="admin-photo-thumb admin-photo-thumb--empty">Нет фото</div>`}</div>  <div class="application__meta">    <span>MAX ID: ${escapeHtml(item.max_user_id || user.max_user_id || "—")}</span>    <span>Факультет: ${escapeHtml(user.faculty || item.faculty || "—")}</span>    <span>Группа: ${escapeHtml(user.group_name || item.group_name || "—")}</span>    <span>Направление: ${item.direction === "gym" ? "Спортзал" : "Бассейн"}</span>    <span>Месяц: ${escapeHtml(monthLabel(item.target_year, item.target_month))}</span>    <span>Очередь: ${escapeHtml(item.queue_position)}</span>    <span>Статус: <span class="status-chip ${escapeHtml(status.className)}">${escapeHtml(status.text)}</span></span>  </div>  <div class="actions">    <button class="btn-primary btn-small" data-action="issue-membership" data-application-id="${escapeHtml(item.id)}" ${state.issuingMembershipId ? "disabled" : ""}>${state.issuingMembershipId === item.id ? "Выдаём..." : "Выдать абонемент"}</button>  </div></article>`;
  }

  function adminDirectoryRows() {
    if (state.adminDirectoryCategory === "queue") {
      return getFilteredAdminQueue().map((item) => ({
        key: `queue-${item.id}`,
        photoUrl: item.profile_photo_signed_url || item.user?.profile_photo_url || item.profile_photo_url || "",
        name: item.user?.full_name || item.full_name || "—",
        maxUserId: item.max_user_id || item.user?.max_user_id || "—",
        faculty: item.user?.faculty || item.faculty || "—",
        groupName: item.user?.group_name || item.group_name || "—",
        category: item.direction === "gym" ? "Спортзал" : "Бассейн",
        period: monthLabel(item.target_year, item.target_month),
        statusHtml: `<span class="status-chip ${escapeHtml(applicationStatusLabel(item.status).className)}">${escapeHtml(applicationStatusLabel(item.status).text)}</span>`,
      }));
    }
    if (state.adminDirectoryCategory === "profiles") {
      return state.pendingReviews.map((user) => ({
        key: `profile-${user.max_user_id}`,
        photoUrl: user.profile_photo_url || "",
        name: user.full_name || "Без имени",
        maxUserId: user.max_user_id || "—",
        faculty: user.faculty || "—",
        groupName: user.group_name || "—",
        category: "Профиль",
        period: "На проверке",
        statusHtml: `<span class="status-chip ${escapeHtml(verificationLabel(user.verification_status || "pending").className)}">${escapeHtml(verificationLabel(user.verification_status || "pending").text)}</span>`,
      }));
    }
    return state.adminApplications.map((app) => ({
      key: `application-${app.id}`,
      photoUrl: app.profile_photo_signed_url || app.user?.profile_photo_url || app.profile_photo_url || "",
      name: app.user?.full_name || app.full_name || "—",
      maxUserId: app.max_user_id || app.user?.max_user_id || "—",
      faculty: app.user?.faculty || app.faculty || "—",
      groupName: app.user?.group_name || app.group_name || "—",
      category: app.direction === "gym" ? "Спортзал" : "Бассейн",
      period: monthLabel(app.target_year, app.target_month),
      statusHtml: `<span class="status-chip ${escapeHtml(applicationStatusLabel(app.status).className)}">${escapeHtml(applicationStatusLabel(app.status).text)}</span>`,
    }));
  }

  function renderAdminDirectoryTable() {
    const rows = adminDirectoryRows();
    const categoryLabel = state.adminDirectoryCategory === "queue" ? "Очередь" : state.adminDirectoryCategory === "profiles" ? "Профили" : "Заявки";
    return `<section class="card card--wide">  <p class="card__eyebrow">Общий список</p>  <h2>Пользователи по категориям</h2>  <div class="admin-toolbar">    <label class="field">      <span>Категория</span>      <select id="admin-directory-category">        <option value="applications" ${state.adminDirectoryCategory === "applications" ? "selected" : ""}>Заявки</option>        <option value="queue" ${state.adminDirectoryCategory === "queue" ? "selected" : ""}>Очередь</option>        <option value="profiles" ${state.adminDirectoryCategory === "profiles" ? "selected" : ""}>Профили</option>      </select>    </label>    <div class="section-note">Показано записей: ${rows.length}. Категория: ${categoryLabel}.</div>  </div>  ${rows.length === 0 ? `<p>Нет записей</p>` : `<div class="admin-table-wrap"><table class="admin-table">    <thead>      <tr>        <th>Пользователь</th>        <th>MAX ID</th>        <th>Факультет</th>        <th>Группа</th>        <th>Категория</th>        <th>Период</th>        <th>Статус</th>      </tr>    </thead>    <tbody>${rows.map((row) => `      <tr>        <td data-label="Пользователь"><div class="admin-table-user">${row.photoUrl ? `<img class="admin-table-avatar" src="${escapeHtml(row.photoUrl)}" alt="Фото профиля">` : `<div class="admin-table-avatar admin-table-avatar--empty">Нет фото</div>`}<div><strong>${escapeHtml(row.name)}</strong></div></div></td>        <td data-label="MAX ID">${escapeHtml(row.maxUserId)}</td>        <td data-label="Факультет">${escapeHtml(row.faculty)}</td>        <td data-label="Группа">${escapeHtml(row.groupName)}</td>        <td data-label="Категория">${escapeHtml(row.category)}</td>        <td data-label="Период">${escapeHtml(row.period)}</td>        <td data-label="Статус">${row.statusHtml}</td>      </tr>`).join("")}</tbody>  </table></div>`}</section>`;
  }

  renderAdminTab = function renderAdminTabStable() {
    if (!state.session?.is_admin) {
      return `<section class="card"><p>Доступ запрещён</p></section>`;
    }

    ensureAdminExportPeriod();

    const exportPeriodOptions = state.adminExportPeriods.length
      ? state.adminExportPeriods.map((period) => {
          const value = `${period.year}-${String(period.month).padStart(2, "0")}`;
          return `<option value="${value}" ${state.adminExportPeriod === value ? "selected" : ""}>${escapeHtml(period.label)}</option>`;
        }).join("")
      : `<option value="${escapeHtml(state.adminExportPeriod || "")}">Текущий период</option>`;

    const queueMonthOptions = [`<option value="all">Все месяцы</option>`, ...Array.from(new Map(state.adminQueue.map((entry) => {
      const value = `${entry.target_year}-${String(entry.target_month).padStart(2, "0")}`;
      return [value, `<option value="${value}" ${state.adminQueueMonthFilter === value ? "selected" : ""}>${monthLabel(entry.target_year, entry.target_month)}</option>`];
    })).values())].join("");

    const queueFacultyOptions = [`<option value="all">Все факультеты</option>`, ...Array.from(new Map(state.adminQueue.map((entry) => {
      const faculty = entry.user?.faculty || entry.faculty || "";
      return faculty ? [faculty, `<option value="${escapeHtml(faculty)}" ${state.adminQueueFacultyFilter === faculty ? "selected" : ""}>${escapeHtml(faculty)}</option>`] : null;
    }).filter(Boolean)).values())].join("");

    const filteredQueue = getFilteredAdminQueue();
    const photoPreview = (url, alt) => url ? `<img class="admin-photo-thumb" src="${escapeHtml(url)}" alt="${escapeHtml(alt)}">` : `<div class="admin-photo-thumb admin-photo-thumb--empty">Нет фото</div>`;

    const rejectReasonDialog = state.rejectReasonDialogUserIds.length ? `<div class="card card--flat reject-reason-card">  <p class="card__eyebrow">Причина отклонения</p>  <h3>Выберите или укажите причину</h3>  <div class="actions">    <button class="btn-secondary btn-small" data-action="reject-reason" data-reason="Фото не прошло проверку">Фото не прошло проверку</button>    <button class="btn-secondary btn-small" data-action="reject-reason" data-reason="Документ не прошёл проверку">Документ не прошёл проверку</button>    <button class="btn-secondary btn-small" data-action="reject-reason" data-reason="Некорректная группа">Некорректная группа</button>    <button class="btn-secondary btn-small" data-action="reject-reason" data-reason="Некорректные данные">Некорректные данные</button>  </div>  <label class="field field--wide">    <span>Своя причина</span>    <textarea id="reject-custom-reason" rows="3" placeholder="Введите свою причину">${escapeHtml(state.rejectCustomReason)}</textarea>  </label>  <div class="actions">    <button class="btn-danger btn-small" data-action="submit-custom-reject-reason" ${!state.rejectCustomReason.trim() || state.verifyingUser ? "disabled" : ""}>Отклонить со своей причиной</button>    <button class="btn-secondary btn-small" data-action="cancel-reject-reason">Отмена</button>  </div></div>` : "";

    const reviewsSection = `<section class="card card--wide">  <p class="card__eyebrow">Проверка профилей</p>  <h2>Профили на проверке</h2>  ${state.pendingReviews.length ? `<div class="actions">    <button class="btn-primary btn-small" data-action="approve-selected-users" ${!state.selectedReviewUserIds.length || state.verifyingUser ? "disabled" : ""}>Одобрить выбранные</button>    <button class="btn-danger btn-small" data-action="reject-selected-users" ${!state.selectedReviewUserIds.length || state.verifyingUser ? "disabled" : ""}>Отклонить выбранные</button>    <button class="btn-secondary btn-small" data-action="delete-selected-users" ${!state.selectedReviewUserIds.length || state.managingAdmin ? "disabled" : ""}>Удалить профили</button>  </div>` : ""}  ${rejectReasonDialog}  ${state.loadingPendingReviews ? `<p>Загрузка...</p>` : state.pendingReviews.length === 0 ? `<p>Нет профилей на проверке</p>` : `<div class="admin-review-list">${state.pendingReviews.map((user) => `    <article class="application">      <label class="checkbox-row"><input type="checkbox" data-action="toggle-review-user" data-user-id="${escapeHtml(user.max_user_id)}" ${state.selectedReviewUserIds.includes(user.max_user_id) ? "checked" : ""}> <span>Выбрать профиль</span></label>      <strong>${escapeHtml(user.full_name || "Без имени")}</strong>      <div class="application__meta">        <span>Факультет: ${escapeHtml(user.faculty || "—")}</span>        <span>Группа: ${escapeHtml(user.group_name || "—")}</span>        <span>MAX ID: ${escapeHtml(user.max_user_id || "—")}</span>      </div>      <div class="admin-review-media">        ${photoPreview(user.profile_photo_url, "Фото профиля")}        ${user.profile_photo_url ? `<a class="btn-secondary btn-small" href="${escapeHtml(user.profile_photo_url)}" target="_blank" rel="noreferrer">Открыть фото</a>` : ""}        ${photoPreview(user.identity_document_url, "Документ")}        ${user.identity_document_url ? `<a class="btn-secondary btn-small" href="${escapeHtml(user.identity_document_url)}" target="_blank" rel="noreferrer">Открыть документ</a>` : ""}      </div>    </article>`).join("")}</div>`}</section>`;

    const applicationsSection = `<section class="card card--wide">  <p class="card__eyebrow">Заявки</p>  <h2>Просмотр заявок</h2>  <div class="admin-toolbar">    <label class="field">      <span>Статус</span>      <select id="admin-status-filter">        ${["queued", "approved", "issued", "cancelled"].map((status) => `          <option value="${status}" ${state.adminStatusFilter === status ? "selected" : ""}>${status === "queued" ? "В очереди" : status === "approved" ? "Одобрено" : status === "issued" ? "Выдано" : "Отменено"}</option>        `).join("")}      </select>    </label>    <label class="field">      <span>Период выгрузки</span>      <select id="admin-export-period">${exportPeriodOptions}</select>    </label>    <div class="actions">      <button class="btn-secondary" data-action="refresh-admin-applications">Обновить</button>      <button class="btn-primary" data-action="export-admin-applications-gym">Скачать спортзал</button>      <button class="btn-primary" data-action="export-admin-applications-pool">Скачать бассейн</button>    </div>  </div>  ${state.loadingAdminApplications ? `<p>Загрузка...</p>` : state.adminApplications.length === 0 ? `<p>Нет заявок</p>` : `<div class="application-list">${state.adminApplications.map((app) => `    <article class="application">      <strong>${escapeHtml(app.user?.full_name || "—")}</strong>      <div class="admin-review-media">        ${photoPreview(app.profile_photo_signed_url, "Фото профиля")}      </div>      <div class="application__meta">        <span>MAX ID: ${escapeHtml(app.max_user_id || app.user?.max_user_id || "—")}</span>        <span>Факультет: ${escapeHtml(app.user?.faculty || app.faculty || "—")}</span>        <span>Группа: ${escapeHtml(app.user?.group_name || app.group_name || "—")}</span>        <span>Направление: ${app.direction === "gym" ? "Спортзал" : "Бассейн"}</span>        <span>Месяц: ${escapeHtml(monthLabel(app.target_year, app.target_month))}</span>        <span>Очередь: ${escapeHtml(app.queue_position)}</span>      </div>    </article>`).join("")}</div>`}</section>`;

    const queueSection = `<section class="card card--wide">  <p class="card__eyebrow">Очередь</p>  <h2>Ожидают выдачи абонемента</h2>  ${filteredQueue.length ? `<div class="actions">    <button class="btn-primary btn-small" data-action="issue-selected-memberships" ${!state.selectedQueueApplicationIds.length || state.issuingMembershipId ? "disabled" : ""}>Выдать выбранные</button>  </div>` : ""}  <div class="admin-toolbar">    <label class="field">      <span>Направление</span>      <select id="admin-queue-direction-filter">        <option value="all">Все</option>        <option value="gym" ${state.adminQueueDirectionFilter === "gym" ? "selected" : ""}>Спортзал</option>        <option value="pool" ${state.adminQueueDirectionFilter === "pool" ? "selected" : ""}>Бассейн</option>      </select>    </label>    <label class="field">      <span>Месяц</span>      <select id="admin-queue-month-filter">${queueMonthOptions}</select>    </label>    <label class="field">      <span>Факультет</span>      <select id="admin-queue-faculty-filter">${queueFacultyOptions}</select>    </label>    <label class="field">      <span>Период выгрузки</span>      <select id="admin-export-period">${exportPeriodOptions}</select>    </label>    <div class="actions">      <button class="btn-secondary" data-action="refresh-admin-queue">Обновить очередь</button>      <button class="btn-primary" data-action="export-admin-queue-gym">Скачать спортзал</button>      <button class="btn-primary" data-action="export-admin-queue-pool">Скачать бассейн</button>    </div>  </div>  ${state.loadingAdminQueue ? `<p>Загрузка...</p>` : filteredQueue.length === 0 ? `<p>Очередь пуста</p>` : `<div class="application-list">${filteredQueue.map(renderAdminQueueItem).join("")}</div>`}</section>`;

    const broadcastSection = `<section class="card card--wide">  <p class="card__eyebrow">Рассылка</p>  <h2>Сообщение всем пользователям</h2>  <div class="admin-toolbar">    <label class="field field--wide">      <span>Картинка (необязательно)</span>      <input id="broadcast-image-file" type="file" accept="image/*">      ${state.broadcastImageFile ? `<span class="section-note">Выбран файл: ${escapeHtml(state.broadcastImageFile.name)}</span>` : ""}    </label>    <label class="field field--wide">      <span>Текст</span>      <textarea id="broadcast-text" rows="5" placeholder="Введите текст рассылки">${escapeHtml(state.broadcastText)}</textarea>    </label>    <div class="actions">      <button class="btn-primary" data-action="send-broadcast" ${state.sendingBroadcast ? "disabled" : ""}>${state.sendingBroadcast ? "Отправляем..." : "Запустить рассылку"}</button>    </div>  </div></section>`;

    const maintenanceSection = `<section class="card card--wide">  <p class="card__eyebrow">Техработы</p>  <h2>Пауза для пользователей</h2>  <div class="admin-toolbar">    <label class="field field--wide">      <span>Режим техработ</span>      <div class="checkbox-row">        <input id="maintenance-enabled" type="checkbox" ${state.maintenanceEnabled ? "checked" : ""}>        <span>${state.maintenanceEnabled ? "Техработы включены: пользователи увидят экран паузы" : "Техработы выключены: пользователи работают в обычном режиме"}</span>      </div>    </label>    <label class="field field--wide">      <span>Сообщение пользователю</span>      <textarea id="maintenance-message" rows="4" placeholder="Сообщение на время техработ">${escapeHtml(state.maintenanceMessage)}</textarea>    </label>    <div class="actions">      <button class="btn-primary" data-action="save-maintenance" ${state.maintenanceSaving ? "disabled" : ""}>${state.maintenanceSaving ? "Сохраняем..." : "Сохранить режим"}</button>    </div>  </div></section>`;

    const queueLimitsSection = `<section class="card card--wide">  <p class="card__eyebrow">Лимиты очереди</p>  <h2>Управление длиной очереди</h2>  <p class="section-note">Можно задать override отдельно для спортзала и бассейна. Если поле пустое, используется обычная квота из БД.</p>  <div class="admin-toolbar">    <label class="field">      <span>Спортзал</span>      <input id="queue-limit-gym" type="number" min="1" step="1" value="${escapeHtml(state.queueLimitGym)}" placeholder="Например, 10">    </label>    <label class="field">      <span>Бассейн</span>      <input id="queue-limit-pool" type="number" min="1" step="1" value="${escapeHtml(state.queueLimitPool)}" placeholder="Например, 20">    </label>    <div class="actions">      <button class="btn-primary" data-action="save-queue-limits" ${state.savingQueueLimits ? "disabled" : ""}>${state.savingQueueLimits ? "Сохраняем..." : "Сохранить лимиты"}</button>    </div>  </div></section>`;

    const adminControlsSection = `<section class="card card--wide">  <p class="card__eyebrow">Управление</p>  <h2>Администраторы</h2>  <p class="section-note">Добавляйте и удаляйте администраторов по их MAX ID.</p>  <div class="admin-add-form">    <input type="text" id="new-admin-id" placeholder="MAX ID пользователя" value="${escapeHtml(state.newAdminId)}" ${state.managingAdmin ? "disabled" : ""}>    <button class="btn-primary" data-action="add-admin" ${state.managingAdmin ? "disabled" : ""}>${state.managingAdmin ? "Добавление..." : "Добавить админа"}</button>  </div>  ${state.loadingAdmins ? `<p>Загрузка списка...</p>` : `<div class="admin-list">    <h3>Текущие администраторы:</h3>    ${state.adminList.length === 0 ? `<p>Список пуст</p>` : `<ul class="admin-items">${state.adminList.map((adminId) => `      <li class="admin-item">        <span>${escapeHtml(adminId)}</span>        ${adminId === state.primaryAdminId ? `<span class="badge">Главный</span>` : state.confirmRemoveAdminId === adminId ? `<div class="actions"><button class="btn-danger btn-small" data-action="confirm-remove-admin" data-admin-id="${escapeHtml(adminId)}" ${state.managingAdmin ? "disabled" : ""}>Подтвердить удаление</button><button class="btn-secondary btn-small" data-action="cancel-remove-admin">Отмена</button></div>` : `<button class="btn-danger btn-small" data-action="start-remove-admin" data-admin-id="${escapeHtml(adminId)}" ${state.managingAdmin ? "disabled" : ""}>Удалить</button>`}      </li>`).join("")}</ul>`}  </div>`}</section>`;

    return `${reviewsSection}${applicationsSection}${queueSection}${broadcastSection}${maintenanceSection}${queueLimitsSection}${adminControlsSection}`;
  };

  async function addAdmin() {
    const targetId = document.getElementById("new-admin-id")?.value.trim();
    if (!targetId) {
      pushAlert("error", "Введите ID", "Укажите MAX ID пользователя.");
      return;
    }
    state.managingAdmin = true;
    render();
    try {
      await apiPost("/admin/manage-admins", buildPayload({ action: "add", target_user_id: targetId }));
      state.newAdminId = "";
      pushAlert("success", "Админ добавлен", `Пользователь ${targetId} теперь администратор.`);
      await loadAdminList();
    } catch (error) {
      pushAlert("error", "Не удалось добавить", error.message || "Повторите попытку.");
    } finally {
      state.managingAdmin = false;
      render();
    }
  }

  async function removeAdmin(targetId) {
    state.confirmRemoveAdminId = "";
    state.managingAdmin = true;
    render();
    try {
      await apiPost("/admin/manage-admins", buildPayload({ action: "remove", target_user_id: targetId }));
      pushAlert("success", "Админ удалён", `Пользователь ${targetId} больше не администратор.`);
      await loadAdminList();
    } catch (error) {
      pushAlert("error", "Не удалось удалить", error.message || "Повторите попытку.");
    } finally {
      state.managingAdmin = false;
      render();
    }
  }

  async function deleteProfile() {
    state.deletingProfile = true;
    render();
    try {
      await apiPost("/profile/delete", buildPayload());
      state.session.profile = null;
      state.session.applications = [];
      fillProfileForm(null);
      state.showDeleteConfirm = false;
      state.confirmApplication = null;
      pushAlert("success", "Профиль удалён", "Профиль, фотографии и заявки удалены.");
    } catch (error) {
      pushAlert("error", "Профиль не удалён", error.message || "Повторите попытку позже.");
    } finally {
      state.deletingProfile = false;
      render();
    }
  }

  async function previewApplication(direction) {
    state.previewLoading = true;
    state.confirmApplication = null;
    render();
    try {
      const preview = await apiPost("/applications/preview", buildPayload({ direction }));
      if (!preview.available) {
        pushAlert("error", "Создать заявку сейчас нельзя", preview.message || "На ближайшие два месяца мест нет.");
        return;
      }
      state.confirmApplication = { direction, preview };
    } catch (error) {
      pushAlert("error", "Не удалось проверить очередь", error.message || "Повторите попытку позже.");
    } finally {
      state.previewLoading = false;
      render();
    }
  }

  async function createApplication() {
    if (!state.confirmApplication) return;
    state.creatingApplication = true;
    render();
    try {
      const result = await apiPost("/applications", buildPayload({ direction: state.confirmApplication.direction }));
      state.confirmApplication = null;
      pushAlert("success", "Заявка создана", `Вы записаны на ${monthLabel(result.assigned_year, result.assigned_month)}. Место в очереди: ${result.queue_position}.`);
      await loadSession();
    } catch (error) {
      pushAlert("error", "Заявка не создана", error.message || "Повторите попытку позже.");
      state.creatingApplication = false;
      render();
    }
  }

  async function cancelApplication(applicationId) {
    state.cancellingApplicationId = applicationId;
    render();
    try {
      const result = await apiPost("/applications/cancel", buildPayload());
      let message = "Заявка отменена.";
      if (result.promoted_max_user_id) {
        message += " Освободившееся место занял следующий студент, ему придёт уведомление в чат.";
      }
      pushAlert("success", "Заявка отменена", message);
      await loadSession();
    } catch (error) {
      pushAlert("error", "Не удалось отменить заявку", error.message || "Повторите попытку позже.");
    } finally {
      state.cancellingApplicationId = null;
      render();
    }
  }

  async function fillQueue(direction, monthScope) {
    try {
      const result = await apiPost("/debug/fill-queue", buildPayload({ direction, month_scope: monthScope }));
      pushAlert("success", "Тестовая очередь заполнена", `Создано записей: ${result.created}.`);
      await loadSession();
    } catch (error) {
      pushAlert("error", "Не удалось заполнить очередь", error.message || "Повторите попытку позже.");
    }
  }

  async function clearQueue() {
    try {
      await apiPost("/debug/clear-queue", buildPayload());
      pushAlert("success", "Тестовая очередь очищена", "Все debug-записи удалены.");
      await loadSession();
    } catch (error) {
      pushAlert("error", "Не удалось очистить очередь", error.message || "Повторите попытку позже.");
    }
  }

  async function persistDebugToday(value) {
    try {
      const result = await apiPost("/debug/date", buildPayload({ debug_today: value || "" }));
      state.debugToday = result?.debug_today || "";
      await loadSession();
    } catch (error) {
      pushAlert("error", "Не удалось изменить тестовую дату", error.message || "Повторите попытку позже.");
    }
  }

  function renderField(name, label, placeholder) {
    const value = state.profileForm[name] || "";
    const error = state.fieldErrors[name];
    const autocomplete = name === "full_name" ? "name" : "off";
    const autocapitalize = name === "full_name" ? "words" : name === "group_name" ? "characters" : "off";
    return `<label class="field ${error ? "field--invalid" : ""}">  <span>${escapeHtml(label)}</span>  <input type="text" data-field="${escapeHtml(name)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" autocomplete="${autocomplete}" autocapitalize="${autocapitalize}" ${name === "group_name" ? 'spellcheck="false"' : ""}>  ${error ? `<span class="field-error">${escapeHtml(error)}</span>` : ""}</label>
    `;
  }

  function renderFacultyField() {
    const error = state.fieldErrors.faculty;
    const faculties = state.session?.faculties || [];
    return `<label class="field ${error ? "field--invalid" : ""}">  <span>Факультет</span>  <select data-field="faculty">    <option value="">${FACULTY_PLACEHOLDER}</option>    ${faculties.map((faculty) => `      <option value="${escapeHtml(faculty)}" ${state.profileForm.faculty === faculty ? "selected" : ""}>${escapeHtml(faculty)}</option>    `).join("")}  </select>  ${error ? `<span class="field-error">${escapeHtml(error)}</span>` : ""}</label>
    `;
  }

  function renderDocumentHelp() {
    return `<div class="explain-box">  <p class="section-note">Подойдут фотографии документов, где видны ФИО и принадлежность студенту.</p>  <div class="doc-tiles">    ${DOCUMENT_TYPES.map((item) => `      <article class="doc-tile">        <div class="doc-tile__visual">          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}">        </div>        <span class="doc-tile__tag">Можно загрузить</span>        <strong>${escapeHtml(item.title)}</strong>      </article>    `).join("")}  </div></div>
    `;
  }

  function renderUploadCard({ title, hint, readyLabel, ready, previewUrl, placeholderTitle, placeholderHint, inputAction, buttonText, buttonClass, uploading, alt }) {
    return `<div class="upload-card">  <label class="upload-placeholder">    ${previewUrl      ? `<img src="${escapeHtml(previewUrl)}" alt="${escapeHtml(alt)}">`      : `        <div class="upload-placeholder__content">          <strong>${escapeHtml(placeholderTitle)}</strong>          <span class="upload-placeholder__hint">${escapeHtml(placeholderHint)}</span>        </div>      `}    <input type="file" accept="image/*" data-action="${escapeHtml(inputAction)}" ${uploading ? "disabled" : ""}>  </label>  <div class="upload-side">    <div class="status-chip ${ready ? "approved" : "not_submitted"}">${escapeHtml(readyLabel)}</div>    <p class="section-note">${escapeHtml(hint)}</p>    <label class="${escapeHtml(buttonClass)}">      ${uploading ? "Загрузка..." : escapeHtml(buttonText)}      <input type="file" accept="image/*" data-action="${escapeHtml(inputAction)}" hidden ${uploading ? "disabled" : ""}>    </label>  </div></div>
    `;
  }

  function renderTabs() {
    const tabs = [["home", "\u0413\u043b\u0430\u0432\u043d\u0430\u044f"], ["application", "\u0417\u0430\u044f\u0432\u043a\u0438"], ["schedule", "\u0420\u0430\u0441\u043f\u0438\u0441\u0430\u043d\u0438\u0435"], ["profile", "\u041f\u0440\u043e\u0444\u0438\u043b\u044c"]];

    if (state.session?.is_admin) {
      tabs.push(["admin", "\u0410\u0434\u043c\u0438\u043d"]);
    }

    const themeIcon = getThemeIcon();
    const themeLabel = state.theme === "dark" ? "\u0422\u0451\u043c\u043d\u0430\u044f" : "\u0421\u0432\u0435\u0442\u043b\u0430\u044f";

    return `<nav class="tab-switcher" aria-label="\u0420\u0430\u0437\u0434\u0435\u043b\u044b mini-app"><div class="tab-switcher__tabs">${tabs.map(([id, label]) => `
      <button
        class="tab-button ${state.activeTab === id ? "tab-button--active" : ""}"
        data-action="switch-tab"
        data-tab="${id}"
        type="button"
      >
        ${label}
      </button>
    `).join("")}</div><button class="tab-theme-toggle" data-action="toggle-theme" title="\u0421\u043c\u0435\u043d\u0438\u0442\u044c \u0442\u0435\u043c\u0443: ${themeLabel}" type="button">${themeIcon}</button></nav>`;
  }

  function renderProfileTab() {
    const profile = state.session?.profile;
    const status = verificationLabel(profile?.verification_status || "not_submitted");
    const profilePhotoReady = hasProfilePhoto();
    const documentReady = hasIdentityDocument();
    const userId = state.session?.user_id || "";
    const activeApplication = getActiveApplication();
    const membershipAccess = canPresentMembership();

    const registrationReminder = profile
      ? ""
      : `  <section class="card registration-reminder">    <p class="card__eyebrow">Требуется регистрация</p>    <h3>Создайте профиль</h3>    <p>После сохранения данных загрузите фото лица и документ. Проверка профиля нужна для создания заявок.</p>  </section>`;

    const userIdCard = "";

    const profileStep = `<section class="card card--wide step-card">  <div class="step-card__header">    <div class="step-card__number">1</div>    <div>      <p class="card__eyebrow">Профиль</p>      <h3>${profile ? escapeHtml(profile.full_name) : "Новый профиль"}</h3>      <p class="section-note">ФИО, факультет и группа используются в заявках и электронном абонементе.</p>    </div>  </div>  <div class="status-chip ${escapeHtml(status.className)}">${escapeHtml(status.text)}</div>  ${profile?.verification_comment ? `<p class="section-note">${escapeHtml(profile.verification_comment)}</p>` : ""}  ${profile?.verification_status === "approved" ? `<p class="section-note">Если изменить ФИО, факультет или группу, статус профиля будет сброшен на «не подтверждено», и профиль нужно будет отправить на повторную проверку.</p>` : ""}  <div class="form-grid">    ${renderField("full_name", "ФИО", "Иванов Иван Иванович")}    ${renderFacultyField()}    ${renderField("group_name", "Группа", "БИСТ-312")}  </div>  <div class="actions">    <button class="btn-primary" data-action="save-profile" ${state.savingProfile ? "disabled" : ""}>      ${state.savingProfile ? "Сохраняем..." : "Сохранить данные"}    </button>  </div></section>`;

    const photoStep = `<section class="card card--wide step-card">  <div class="step-card__header">    <div class="step-card__number">2</div>    <div>      <h3>Фото для электронного абонемента</h3>      <p class="section-note">Загрузите портретное фото лица, как на паспорт или пропуск.</p>    </div>  </div>  ${renderUploadCard({    hint: "Фотография нужна для электронного абонемента.",    readyLabel: profilePhotoReady ? "Фото профиля загружено" : "Фото профиля не загружено",    ready: profilePhotoReady,    previewUrl: profile?.profile_photo_signed_url || "",    placeholderTitle: "Фото для электронного абонемента",    placeholderHint: "Нажмите на область или кнопку справа",    inputAction: "upload-profile-photo",    buttonText: "Загрузить фото",    buttonClass: "btn-secondary",    uploading: state.uploadingPhoto,    alt: "Фото студента",  })}</section>`;

    const documentStep = `<section class="card card--wide step-card">  <div class="step-card__header">    <div class="step-card__number">3</div>    <div>      <h3>Документ для проверки</h3>      <p class="section-note">Подойдёт документ, где видны ФИО и принадлежность студенту.</p>    </div>  </div>  <div class="actions">    <button class="btn-secondary btn-wide" data-action="toggle-doc-help">      ${state.showDocumentHelp ? "Скрыть подходящие документы" : "Показать подходящие документы"}    </button>  </div>  ${state.showDocumentHelp ? renderDocumentHelp() : ""}  ${renderUploadCard({    hint: "Документ нужен для подтверждения личности администратором.",    readyLabel: documentReady ? "Документ загружен" : "Документ не загружен",    ready: documentReady,    previewUrl: profile?.identity_document_signed_url || profile?.identity_document_url || "",    placeholderTitle: "Фото документа для проверки",    placeholderHint: "Студенческий, пропуск, зачётка или другой допустимый документ",    inputAction: "upload-document",    buttonText: "Загрузить документ",    buttonClass: "btn-primary",    uploading: state.uploadingDocument,    alt: "Документ для проверки",  })}</section>`;

    const submitStep = `<section class="card card--wide step-card">  <div class="step-card__header">    <div class="step-card__number">4</div>    <div>      <h3>Отправка на проверку</h3>      <p class="section-note">Для отправки нужны сохранённый профиль, фото лица и фото документа.</p>    </div>  </div>  <div class="document-box document-box--spaced">    <div class="status-chip ${escapeHtml(status.className)}">${escapeHtml(status.text)}</div>    <div class="actions">      <button        class="btn-secondary btn-wide"        data-action="submit-review"        ${(profilePhotoReady && documentReady && !state.submittingReview && !["pending", "approved"].includes(profile?.verification_status || "")) ? "" : "disabled"}      >        ${state.submittingReview ? "Отправляем..." : "Отправить профиль на проверку"}      </button>    </div>  </div></section>`;

    const deleteSection = `<section class="card card--wide">  <h3>Удаление профиля</h3>  <p class="section-note">Удалятся профиль, загруженные фотографии и все заявки.</p>  ${state.showDeleteConfirm    ? `      <div class="confirm-box confirm-box--warning">        <strong>Удалить профиль и все заявки?</strong>        <div class="actions">          <button class="btn-danger" data-action="confirm-delete-profile" ${state.deletingProfile ? "disabled" : ""}>            ${state.deletingProfile ? "Удаляем..." : "Да, удалить"}          </button>          <button class="btn-secondary" data-action="cancel-delete-profile">Отмена</button>        </div>      </div>    `    : `      <div class="actions">        <button class="btn-danger" data-action="start-delete-profile" ${profile ? "" : "disabled"}>Удалить профиль</button>      </div>    `}</section>`;

    return `${registrationReminder}${userIdCard}${renderProfileStatusSection(profile, status, activeApplication, membershipAccess)}${profileStep}${photoStep}${documentStep}${submitStep}${deleteSection}`;
  }

  function renderHomeScheduleCard() {
    if (state.loadingSchedule) {
      return `<section class="card card--wide">  <p class="card__eyebrow">Расписание</p>  <h3>Подгружаем свободные дорожки</h3>  <p>Смотрим ближайшие слоты бассейна.</p></section>`;
    }
    if (state.scheduleError) {
      return `<section class="card card--wide">  <p class="card__eyebrow">Расписание</p>  <h3>Не удалось загрузить обзор</h3>  <p>${escapeHtml(state.scheduleError)}</p>  <div class="actions"><button class="btn-secondary" data-action="switch-tab" data-tab="schedule">Открыть расписание</button></div></section>`;
    }
    const today = getPoolToday();
    const daySlots = state.poolScheduleParsed[today] || [];
    const previewSlots = daySlots.slice(0, 3);
    return `<section class="card card--wide">  <p class="card__eyebrow">Расписание</p>  <h3>Сегодня: ${escapeHtml(today)}</h3>  ${previewSlots.length ? `<div class="application-list">${previewSlots.map((slot) => { const total = slot.lanes.length; const free = slot.lanes.filter((lane) => !lane.busy).length; return `<article class="application">  <strong>${escapeHtml(slot.time)}</strong>  <div class="application__meta">    <span>Свободно: ${escapeHtml(String(free))}/${escapeHtml(String(total))}</span>    ${isNowInRange(slot.time) ? `<span class="status-chip approved">Сейчас</span>` : ""}  </div></article>`; }).join("")}</div>` : `<p>На сегодня краткого обзора пока нет.</p>`}  <div class="actions"><button class="btn-secondary" data-action="switch-tab" data-tab="schedule">Открыть всё расписание</button></div></section>`;
  }

  function renderHomeTab(profile, activeApplication, verification, membershipAccess) {
    return `${renderMembershipSummaryCard(profile, activeApplication, membershipAccess)}${renderHomeScheduleCard()}`;
  }

  function renderScheduleTab() {
    if (!state.scheduleEntryPoint) {
      return `<section class="card card--wide schedule-entry-card">  <p class="card__eyebrow">Расписание</p>  <h2>Что хотите посмотреть?</h2>  <p>Выберите направление. Для бассейна откроем живое расписание дорожек, для зала подготовим отдельный экран позже.</p>  <div class="schedule-entry-grid">    <button class="schedule-entry-button" data-action="open-schedule-entry" data-entry="pool" type="button">      <span class="schedule-entry-button__eyebrow">Плавание</span>      <strong>Бассейн</strong>      <span>Большой и малый бассейн, дни недели и фильтр по свободным дорожкам.</span>    </button>    <button class="schedule-entry-button" data-action="open-schedule-entry" data-entry="gym" type="button">      <span class="schedule-entry-button__eyebrow">Тренировки</span>      <strong>Зал</strong>      <span>Раздел зарезервирован под расписание спортзала и групповых активностей.</span>    </button>  </div></section>`;
    }

    if (state.scheduleEntryPoint === "gym") {
      return `<section class="card card--wide">  <div class="schedule-screen__header">    <div>      <p class="card__eyebrow">Расписание</p>      <h2>Зал</h2>      <p class="section-note">Экран для спортзала пока не подключён. Можно вернуться назад и открыть расписание бассейна.</p>    </div>    <button class="btn-secondary" data-action="back-to-schedule-menu" type="button">Назад</button>  </div></section>`;
    }

    return renderPoolScheduleView();
  }

  function renderPoolScheduleView() {
    const activePoolLabel = state.poolSchedulePool === "big" ? "Большой бассейн" : "Малый бассейн";
    const dayTabs = Object.keys(state.poolScheduleParsed).map((day) => `      <button class="tab-button schedule-day-button ${state.poolScheduleDay === day ? "tab-button--active" : ""}" data-action="set-schedule-day" data-day="${escapeHtml(day)}" type="button">${escapeHtml(day)}</button>    `).join("");

    return `<section class="card card--wide schedule-screen">  <div class="schedule-screen__header">    <div>      <p class="card__eyebrow">Расписание</p>      <h2>${escapeHtml(getScheduleTitle())}</h2>      <p class="section-note">Текущий просмотр: ${escapeHtml(activePoolLabel)}. Лучший слот и текущее время подсвечиваются автоматически.</p>    </div>    <button class="btn-secondary" data-action="back-to-schedule-menu" type="button">Назад</button>  </div>  <div class="schedule-toolbar">    <div class="schedule-pool-toggle">      <button class="tab-button ${state.poolSchedulePool === "big" ? "tab-button--active" : ""}" data-action="set-schedule-pool" data-pool="big" type="button">Большой бассейн</button>      <button class="tab-button ${state.poolSchedulePool === "small" ? "tab-button--active" : ""}" data-action="set-schedule-pool" data-pool="small" type="button">Малый бассейн</button>    </div>    <div class="schedule-toolbar__actions">      <label class="field">        <span>Свободные дорожки</span>        <select id="schedule-lane-filter">          <option value="0" ${state.poolScheduleMinFreeLanes === 0 ? "selected" : ""}>Все</option>          <option value="1" ${state.poolScheduleMinFreeLanes === 1 ? "selected" : ""}>Любая свободная</option>          <option value="2" ${state.poolScheduleMinFreeLanes === 2 ? "selected" : ""}>От 2 дорожек</option>          <option value="3" ${state.poolScheduleMinFreeLanes === 3 ? "selected" : ""}>От 3 дорожек</option>          <option value="4" ${state.poolScheduleMinFreeLanes === 4 ? "selected" : ""}>От 4 дорожек</option>          <option value="5" ${state.poolScheduleMinFreeLanes === 5 ? "selected" : ""}>От 5 дорожек</option>          <option value="6" ${state.poolScheduleMinFreeLanes === 6 ? "selected" : ""}>От 6 дорожек</option>        </select>      </label>      <button class="btn-secondary" data-action="reset-schedule-filter" type="button">Показать всё</button>    </div>  </div>  <div class="schedule-days">${dayTabs}</div>  ${state.loadingSchedule ? `<section class="card"><p class="card__eyebrow">Загрузка</p><h3>Подгружаем расписание</h3><p>Это занимает пару секунд.</p></section>` : state.scheduleError ? `<section class="card"><p class="card__eyebrow">Ошибка</p><h3>Расписание недоступно</h3><p>${escapeHtml(state.scheduleError)}</p></section>` : renderPoolScheduleSlots()}</section>`;
  }

  function renderPoolScheduleSlots() {
    const daySlots = state.poolScheduleParsed[state.poolScheduleDay] || [];
    if (!daySlots.length) {
      return `<div class="empty-state">Нет данных на этот день.</div>`;
    }

    const maxFree = Math.max(...daySlots.map((slot) => slot.lanes.filter((lane) => !lane.busy).length), 0);
    const today = getPoolToday();
    const visibleSlots = daySlots.filter((slot) => slot.lanes.filter((lane) => !lane.busy).length >= state.poolScheduleMinFreeLanes);

    if (!visibleSlots.length) {
      return `<div class="empty-state">Нет подходящих слотов.</div>`;
    }

    return `<div class="schedule-slot-grid">${visibleSlots.map((slot) => {const total = slot.lanes.length;const free = slot.lanes.filter((lane) => !lane.busy).length;const isNow = state.poolScheduleDay === today && isNowInRange(slot.time);const isBest = free === maxFree && maxFree > 0;return `        <article class="schedule-slot ${isNow ? "schedule-slot--now" : ""} ${isBest ? "schedule-slot--best" : ""}">          <div class="schedule-slot__header">            <strong>${escapeHtml(slot.time)}</strong>            <span class="schedule-slot__count">Свободно: ${escapeHtml(String(free))}/${escapeHtml(String(total))}</span>            ${isNow ? `<span class="status-chip approved">Сейчас</span>` : ""}            ${free === 0 ? `<span class="status-chip rejected">Все занято</span>` : ""}          </div>          <div class="schedule-lanes">            ${slot.lanes.map((lane) => `<span class="schedule-lane ${lane.busy ? "schedule-lane--busy" : "schedule-lane--free"}">${escapeHtml(String(lane.lane))}</span>`).join("")}          </div>        </article>      `;}).join("")}</div>`;
  }

  function renderApplicationTab(profile) {
    const activeApplication = getActiveApplication();
    const applications = state.session?.applications || [];

    const newApplicationSection = `<section class="card card--wide">  <p class="card__eyebrow">Новая заявка</p>  <h3>Выберите направление</h3>  <p>До 26 числа запись идёт на ближайший следующий месяц. Если мест нет, проверяется только ещё один месяц вперёд.</p>  <div class="application-actions">    <button class="btn-primary" data-action="preview-application" data-direction="gym" ${(profile?.verification_status === "approved" && !state.previewLoading) ? "" : "disabled"}>${state.previewLoading ? "Проверяем..." : "🏋️ Спортзал"}</button>    <button class="btn-primary" data-action="preview-application" data-direction="pool" ${(profile?.verification_status === "approved" && !state.previewLoading) ? "" : "disabled"}>${state.previewLoading ? "Проверяем..." : "🏊 Бассейн"}</button>  </div>  ${profile?.verification_status === "approved" ? "" : `<p class="section-note">Для заявки нужен подтверждённый профиль.</p>`}  ${renderApplicationPreview()}</section>`;

    return `${renderApplicationAccessCard(profile)}${newApplicationSection}${renderCurrentApplicationCard(activeApplication)}${renderApplicationHistoryCard(applications)}`;
  }

  function renderMembershipModal() {
    if (!state.membershipModalOpen) return "";
    const profile = state.session?.profile;
    const application = getActiveApplication();
    if (!profile || !application) return "";

    const directionLabel = application.direction === "gym" ? "\u0421\u043f\u043e\u0440\u0442\u0437\u0430\u043b" : "\u0411\u0430\u0441\u0441\u0435\u0439\u043d";
    const serial = membershipNumber(application);

    const modalHeader = `<div class="modal-card__timer">\u0410\u0431\u043e\u043d\u0435\u043c\u0435\u043d\u0442 \u0437\u0430\u043a\u0440\u043e\u0435\u0442\u0441\u044f \u0447\u0435\u0440\u0435\u0437 ${escapeHtml(state.membershipSecondsLeft)} \u0441\u0435\u043a.</div>    <div class="modal-card__header">      <strong>\u042d\u043b\u0435\u043a\u0442\u0440\u043e\u043d\u043d\u044b\u0439 \u0430\u0431\u043e\u043d\u0435\u043c\u0435\u043d\u0442</strong>      <button class="icon-button" data-action="close-membership" aria-label="\u0417\u0430\u043a\u0440\u044b\u0442\u044c">\u00D7</button>    </div>`;

    const photoSection = profile.profile_photo_signed_url
      ? `<img src="${escapeHtml(profile.profile_photo_signed_url)}" alt="\u0424\u043e\u0442\u043e \u0441\u0442\u0443\u0434\u0435\u043d\u0442\u0430">`
      : `<span>\u0424\u043e\u0442\u043e</span>`;

    const membershipCard = `<div class="membership-card">        <div class="membership-card__header">          <div>            <p class="membership-card__eyebrow">\u0426\u0420\u0421 / \u0421\u043f\u043e\u0440\u0442</p>            <div class="membership-card__title">              <span>\u0410\u0411\u041e\u041d\u0415\u041c\u0415\u041d\u0422</span>            </div>          </div>          <div class="membership-card__serial-block">            <span class="membership-card__serial-label">\u2116 \u043f\u0440\u043e\u043f\u0443\u0441\u043a\u0430</span>            <strong class="membership-card__serial-value">${escapeHtml(serial)}</strong>          </div>        </div>        <div class="membership-card__grid">          <div class="membership-card__photo">            ${photoSection}          </div>          <div class="membership-card__lines">            <div class="membership-card__line">              <span class="membership-card__label">\u0424.\u0418.\u041e.</span>              <div class="membership-card__value">${escapeHtml(profile.full_name)}</div>            </div>            <div class="membership-card__line">              <span class="membership-card__label">\u0424\u0430\u043a\u0443\u043b\u044c\u0442\u0435\u0442</span>              <div class="membership-card__value">${escapeHtml(profile.faculty)}</div>            </div>            <div class="membership-card__line">              <span class="membership-card__label">\u041d\u0430\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435</span>              <div class="membership-card__value">${escapeHtml(directionLabel)}</div>            </div>            <div class="membership-card__line">              <span class="membership-card__label">\u041c\u0435\u0441\u044f\u0446</span>              <div class="membership-card__value">${escapeHtml(fullMonthLabel(application.target_year, application.target_month))}</div>            </div>          </div>        </div>        <div class="membership-card__footer">          <div class="membership-card__stamp">\u0414\u0415\u0419\u0421\u0422\u0412\u0423\u0415\u0422</div>          <div class="membership-card__issuer">            <span>\u0414\u043e\u043f\u0443\u0441\u043a \u043f\u043e \u0437\u0430\u044f\u0432\u043a\u0435</span>            <strong>${escapeHtml(directionLabel)} / ${escapeHtml(monthLabel(application.target_year, application.target_month))}</strong>          </div>        </div>      </div>`;

    return `<div class="modal-overlay" data-action="close-membership">  <div class="modal-card" role="dialog" aria-modal="true" aria-label="\u042d\u043b\u0435\u043a\u0442\u0440\u043e\u043d\u043d\u044b\u0439 \u0430\u0431\u043e\u043d\u0435\u043c\u0435\u043d\u0442">    ${modalHeader}    <div class="modal-card__body">      ${membershipCard}    </div>  </div></div>`;
  }

  function renderApplicationPreview() {
    if (!state.confirmApplication) return "";
    const { direction, preview } = state.confirmApplication;
    const directionLabel = direction === "gym" ? "Спортзал" : "Бассейн";
    return `<div class="confirm-box">  <strong>Подтвердите заявку</strong>  <div class="selected-direction">    <span>Выбранное направление</span>    <strong>${escapeHtml(directionLabel)}</strong>  </div>  <div class="preview-details">    <div class="preview-detail">      <span>Предварительный месяц</span>      <strong>${escapeHtml(monthLabel(preview.assigned_year, preview.assigned_month))}</strong>    </div>    <div class="preview-detail">      <span>Место в очереди</span>      <strong>${escapeHtml(preview.queue_position)}</strong>    </div>    <div class="preview-detail">      <span>Лимит по факультету</span>      <strong>${escapeHtml(preview.quota_limit)}</strong>    </div>  </div>  <div class="actions">    <button class="btn-primary" data-action="confirm-application" ${state.creatingApplication ? "disabled" : ""}>      ${state.creatingApplication ? "Создаём..." : "Подтвердить заявку"}    </button>    <button class="btn-secondary" data-action="clear-application-confirm">Отмена</button>  </div></div>
    `;
  }

  function buildTestDate(day) {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function buildNextMonth26() {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 26);
    return `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-26`;
  }

  function buildCurrentMonthDay(day) {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function buildNextMonthDay(day) {
    const today = new Date();
    const target = new Date(today.getFullYear(), today.getMonth() + 1, day);
    return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function renderDebugCard() {
    if (!state.session?.debug_available) return "";
    return `<section class="card card--wide">  <p class="card__eyebrow">Debug</p>  <h3>Проверка очереди</h3>  <div class="debug-grid">    <button class="btn-secondary" data-action="set-debug-date" data-date="${new Date().toISOString().slice(0, 10)}">Сегодня</button>    <button class="btn-secondary" data-action="set-debug-date" data-date="${buildTestDate(26)}">Сделать сегодня 26-е</button>    <button class="btn-secondary" data-action="set-debug-date" data-date="${buildNextMonth26()}">Сделать 26-е следующего месяца</button>    <button class="btn-secondary" data-action="set-debug-date" data-date="${buildCurrentMonthDay(27)}">Сегодня 27</button>    <button class="btn-secondary" data-action="set-debug-date" data-date="${buildNextMonthDay(27)}">Сегодня 27 следующего месяца</button>    <button class="btn-secondary" data-action="set-debug-date" data-date="${buildCurrentMonthDay(1)}">Сегодня 1</button>    <button class="btn-secondary" data-action="set-debug-date" data-date="${buildNextMonthDay(1)}">Сегодня 1 следующего месяца</button>    <button class="btn-secondary" data-action="clear-debug-date">Сбросить тестовую дату</button>    <button class="btn-warning" data-action="fill-queue" data-direction="gym" data-scope="first">Заполнить спортзал на ближайший месяц</button>    <button class="btn-warning" data-action="fill-queue" data-direction="gym" data-scope="second">Заполнить спортзал на следующий месяц</button>    <button class="btn-warning" data-action="fill-queue" data-direction="pool" data-scope="first">Заполнить бассейн на ближайший месяц</button>    <button class="btn-warning" data-action="fill-queue" data-direction="pool" data-scope="second">Заполнить бассейн на следующий месяц</button>    <button class="btn-danger" data-action="clear-debug-queue">Очистить test-очередь</button>  </div>  <p class="section-note">Текущая эффективная дата: ${escapeHtml(state.session.effective_today)}</p></section>
    `;
  }

  renderAdminTab = function renderAdminTabExtended() {
    if (!state.session?.is_admin) {
      return `<section class="card"><p>Доступ запрещён</p></section>`;
    }

    ensureAdminExportPeriod();

    const exportPeriodOptions = state.adminExportPeriods.length
      ? state.adminExportPeriods.map((period) => {
          const value = `${period.year}-${String(period.month).padStart(2, "0")}`;
          return `<option value="${value}" ${state.adminExportPeriod === value ? "selected" : ""}>${escapeHtml(period.label)}</option>`;
        }).join("")
      : `<option value="${escapeHtml(state.adminExportPeriod || "")}">Текущий период</option>`;

    const queueMonthOptions = [`<option value="all">Все месяцы</option>`, ...Array.from(new Map(state.adminQueue.map((item) => {
      const value = `${item.target_year}-${String(item.target_month).padStart(2, "0")}`;
      return [value, `<option value="${value}" ${state.adminQueueMonthFilter === value ? "selected" : ""}>${monthLabel(item.target_year, item.target_month)}</option>`];
    })).values())].join("");

    const queueFacultyOptions = [`<option value="all">Все факультеты</option>`, ...Array.from(new Map(state.adminQueue.map((item) => {
      const faculty = item.user?.faculty || item.faculty || "";
      return faculty ? [faculty, `<option value="${escapeHtml(faculty)}" ${state.adminQueueFacultyFilter === faculty ? "selected" : ""}>${escapeHtml(faculty)}</option>`] : null;
    }).filter(Boolean)).values())].join("");

    const filteredQueue = getFilteredAdminQueue();


    const photoPreview = (url, alt) => url ? `<img class="admin-photo-thumb" src="${escapeHtml(url)}" alt="${escapeHtml(alt)}">` : `<div class="admin-photo-thumb admin-photo-thumb--empty">Нет фото</div>`;

    const rejectReasonDialog = state.rejectReasonDialogUserIds.length ? `<div class="card card--flat">  <p class="card__eyebrow">Причина отклонения</p>  <div class="actions">    <button class="btn-secondary btn-small" data-action="reject-reason" data-reason="Фото не прошло проверку">Фото не прошло проверку</button>    <button class="btn-secondary btn-small" data-action="reject-reason" data-reason="Документ не прошёл проверку">Документ не прошёл проверку</button>    <button class="btn-secondary btn-small" data-action="reject-reason" data-reason="Некорректная группа">Некорректная группа</button>    <button class="btn-secondary btn-small" data-action="reject-reason" data-reason="Некорректные данные">Некорректные данные</button>  </div>  <label class="field field--wide">    <span>Своя причина</span>    <textarea id="reject-custom-reason" rows="3" placeholder="Введите свою причину">${escapeHtml(state.rejectCustomReason)}</textarea>  </label>  <div class="actions">    <button class="btn-danger btn-small" data-action="submit-custom-reject-reason" ${!state.rejectCustomReason.trim() || state.verifyingUser ? "disabled" : ""}>Отклонить со своей причиной</button>    <button class="btn-secondary btn-small" data-action="cancel-reject-reason">Отмена</button>  </div></div>` : "";

    const reviewsSection = `<section class="card card--wide">  <p class="card__eyebrow">Проверка профилей</p>  <h2>Профили на проверке</h2>  ${state.pendingReviews.length ? `<div class="actions">    <button class="btn-primary btn-small" data-action="approve-selected-users" ${!state.selectedReviewUserIds.length || state.verifyingUser ? "disabled" : ""}>Одобрить выбранные</button>    <button class="btn-danger btn-small" data-action="reject-selected-users" ${!state.selectedReviewUserIds.length || state.verifyingUser ? "disabled" : ""}>Отклонить выбранные</button>    <button class="btn-secondary btn-small" data-action="delete-selected-users" ${!state.selectedReviewUserIds.length || state.managingAdmin ? "disabled" : ""}>Удалить профили</button>  </div>` : ""}  ${rejectReasonDialog}  ${state.loadingPendingReviews ? `<p>Загрузка...</p>` : state.pendingReviews.length === 0 ? `<p>Нет профилей на проверке</p>` : `<div class="admin-review-list">${state.pendingReviews.map((user) => `    <article class="application">      <label class="checkbox-row"><input type="checkbox" data-action="toggle-review-user" data-user-id="${escapeHtml(user.max_user_id)}" ${state.selectedReviewUserIds.includes(user.max_user_id) ? "checked" : ""}> <span>Выбрать профиль</span></label>      <strong>${escapeHtml(user.full_name || "Без имени")}</strong>      <div class="application__meta">        <span>Факультет: ${escapeHtml(user.faculty || "—")}</span>        <span>Группа: ${escapeHtml(user.group_name || "—")}</span>        <span>MAX ID: ${escapeHtml(user.max_user_id || "—")}</span>      </div>      <div class="admin-review-media">        ${photoPreview(user.profile_photo_url, "Фото профиля")}        ${user.profile_photo_url ? `<a class="btn-secondary btn-small" href="${escapeHtml(user.profile_photo_url)}" target="_blank" rel="noreferrer">Открыть фото</a>` : ""}        ${photoPreview(user.identity_document_url, "Документ")}        ${user.identity_document_url ? `<a class="btn-secondary btn-small" href="${escapeHtml(user.identity_document_url)}" target="_blank" rel="noreferrer">Открыть документ</a>` : ""}      </div>      <div class="application__footer">        <button class="btn-primary btn-small" data-action="approve-user" data-user-id="${escapeHtml(user.max_user_id)}" ${state.verifyingUser ? "disabled" : ""}>Одобрить</button>        <button class="btn-danger btn-small" data-action="reject-user" data-user-id="${escapeHtml(user.max_user_id)}" ${state.verifyingUser ? "disabled" : ""}>Отклонить</button>      </div>    </article>`).join("")}</div>`}</section>`;

    const applicationsSection = `<section class="card card--wide">  <p class="card__eyebrow">Заявки</p>  <h2>Просмотр заявок</h2>  <div class="admin-toolbar">    <label class="field">      <span>Статус</span>      <select id="admin-status-filter">        ${["queued", "approved", "issued", "cancelled"].map((status) => `          <option value="${status}" ${state.adminStatusFilter === status ? "selected" : ""}>${status === "queued" ? "В очереди" : status === "approved" ? "Одобрено" : status === "issued" ? "Выдано" : "Отменено"}</option>        `).join("")}      </select>    </label>    <label class="field">      <span>Период выгрузки</span>      <select id="admin-export-period">${exportPeriodOptions}</select>    </label>    <div class="actions">      <button class="btn-secondary" data-action="refresh-admin-applications">Обновить</button>      <button class="btn-primary" data-action="export-admin-applications-gym">Скачать спортзал</button>      <button class="btn-primary" data-action="export-admin-applications-pool">Скачать бассейн</button>    </div>  </div>  ${state.loadingAdminApplications ? `<p>Загрузка...</p>` : state.adminApplications.length === 0 ? `<p>Нет заявок</p>` : `<div class="application-list">${state.adminApplications.map((app) => `    <article class="application">      <strong>${escapeHtml(app.user?.full_name || "—")}</strong>      <div class="admin-review-media">        ${photoPreview(app.profile_photo_signed_url, "Фото профиля")}      </div>      <div class="application__meta">        <span>MAX ID: ${escapeHtml(app.max_user_id || app.user?.max_user_id || "—")}</span>        <span>Факультет: ${escapeHtml(app.user?.faculty || app.faculty || "—")}</span>        <span>Группа: ${escapeHtml(app.user?.group_name || app.group_name || "—")}</span>        <span>Направление: ${app.direction === "gym" ? "Спортзал" : "Бассейн"}</span>        <span>Месяц: ${escapeHtml(monthLabel(app.target_year, app.target_month))}</span>        <span>Очередь: ${escapeHtml(app.queue_position)}</span>        <span>Статус: <span class="status-chip ${escapeHtml(applicationStatusLabel(app.status).className)}">${escapeHtml(applicationStatusLabel(app.status).text)}</span></span>      </div>      <div class="application__footer">        <button class="btn-primary btn-small" data-action="issue-membership" data-application-id="${escapeHtml(item.id)}" ${(state.issuingMembershipId && String(state.issuingMembershipId) !== String(item.id)) ? "disabled" : ""}>${state.issuingMembershipId === item.id ? "Выдаём..." : "Выдать абонемент"}</button>      </div>    </article>`).join("")}</div>`}</section>`;

    const queueSection = `<section class="card card--wide">  <p class="card__eyebrow">Очередь</p>  <h2>Ожидают выдачи абонемента</h2>  ${filteredQueue.length ? `<div class="actions">    <button class="btn-primary btn-small" data-action="issue-selected-memberships" ${!state.selectedQueueApplicationIds.length || state.issuingMembershipId ? "disabled" : ""}>Выдать выбранные</button>  </div>` : ""}  <div class="admin-toolbar">    <label class="field">      <span>Направление</span>      <select id="admin-queue-direction-filter">        <option value="all">Все</option>        <option value="gym" ${state.adminQueueDirectionFilter === "gym" ? "selected" : ""}>Спортзал</option>        <option value="pool" ${state.adminQueueDirectionFilter === "pool" ? "selected" : ""}>Бассейн</option>      </select>    </label>    <label class="field">      <span>Месяц</span>      <select id="admin-queue-month-filter">${queueMonthOptions}</select>    </label>    <label class="field">      <span>Факультет</span>      <select id="admin-queue-faculty-filter">${queueFacultyOptions}</select>    </label>    <label class="field">      <span>Период выгрузки</span>      <select id="admin-export-period">${exportPeriodOptions}</select>    </label>    <div class="actions">      <button class="btn-secondary" data-action="refresh-admin-queue">Обновить очередь</button>      <button class="btn-primary" data-action="export-admin-queue-gym">Скачать спортзал</button>      <button class="btn-primary" data-action="export-admin-queue-pool">Скачать бассейн</button>    </div>  </div>  ${state.loadingAdminQueue ? `<p>Загрузка...</p>` : filteredQueue.length === 0 ? `<p>Очередь пуста</p>` : `<div class="application-list">${filteredQueue.map((item) => `    <article class="application">      <label class="checkbox-row"><input type="checkbox" data-action="toggle-queue-application" data-application-id="${escapeHtml(item.id)}" ${state.selectedQueueApplicationIds.includes(String(item.id)) ? "checked" : ""}> <span>Выбрать заявку</span></label>      <strong>${escapeHtml(item.user?.full_name || item.full_name || "—")}</strong>      <div class="admin-review-media">        ${photoPreview(item.profile_photo_signed_url, "Фото профиля")}      </div>      <div class="application__meta">        <span>MAX ID: ${escapeHtml(item.max_user_id || item.user?.max_user_id || "—")}</span>        <span>Факультет: ${escapeHtml(item.user?.faculty || item.faculty || "—")}</span>        <span>Группа: ${escapeHtml(item.user?.group_name || item.group_name || "—")}</span>        <span>Направление: ${item.direction === "gym" ? "Спортзал" : "Бассейн"}</span>        <span>Месяц: ${escapeHtml(monthLabel(item.target_year, item.target_month))}</span>        <span>Место в очереди: ${escapeHtml(item.queue_position)}</span>        <span>Статус: <span class="status-chip ${escapeHtml(applicationStatusLabel(item.status).className)}">${escapeHtml(applicationStatusLabel(item.status).text)}</span></span>      </div>      <div class="application__footer">        <button class="btn-primary btn-small" data-action="issue-membership" data-application-id="${escapeHtml(item.id)}" ${state.issuingMembershipId === item.id ? "disabled" : ""}>${state.issuingMembershipId === item.id ? "Выдаём..." : "Выдать абонемент"}</button>      </div>    </article>`).join("")}</div>`}</section>`;

    const broadcastSection = `<section class="card card--wide">  <p class="card__eyebrow">Рассылка</p>  <h2>Сообщение всем пользователям</h2>  <div class="admin-toolbar">    <label class="field field--wide">      <span>Картинка (необязательно)</span>      <input id="broadcast-image-file" type="file" accept="image/*">      ${state.broadcastImageFile ? `<span class="section-note">Выбран файл: ${escapeHtml(state.broadcastImageFile.name)}</span>` : ""}    </label>    <label class="field field--wide">      <span>Текст</span>      <textarea id="broadcast-text" rows="5" placeholder="Введите текст рассылки">${escapeHtml(state.broadcastText)}</textarea>    </label>    <div class="actions">      <button class="btn-primary" data-action="send-broadcast" ${state.sendingBroadcast ? "disabled" : ""}>${state.sendingBroadcast ? "Отправляем..." : "Запустить рассылку"}</button>    </div>  </div></section>`;

    const maintenanceSection = `<section class="card card--wide">  <p class="card__eyebrow">Техработы</p>  <h2>Пауза для пользователей</h2>  <div class="admin-toolbar">    <label class="field field--wide">      <span>Режим техработ</span>      <div class="checkbox-row">        <input id="maintenance-enabled" type="checkbox" ${state.maintenanceEnabled ? "checked" : ""}>        <span>${state.maintenanceEnabled ? "Техработы включены: пользователи увидят экран паузы" : "Техработы выключены: пользователи работают в обычном режиме"}</span>      </div>    </label>    <label class="field field--wide">      <span>Сообщение пользователю</span>      <textarea id="maintenance-message" rows="4" placeholder="Сообщение на время техработ">${escapeHtml(state.maintenanceMessage)}</textarea>    </label>    <div class="actions">      <button class="btn-primary" data-action="save-maintenance" ${state.maintenanceSaving ? "disabled" : ""}>${state.maintenanceSaving ? "Сохраняем..." : "Сохранить режим"}</button>    </div>  </div></section>`;

    const queueLimitsSection = `<section class="card card--wide">  <p class="card__eyebrow">Лимиты очереди</p>  <h2>Управление длиной очереди</h2>  <p class="section-note">Можно задать override отдельно для спортзала и бассейна. Если поле пустое, используется обычная квота из БД.</p>  <div class="admin-toolbar">    <label class="field">      <span>Спортзал</span>      <input id="queue-limit-gym" type="number" min="1" step="1" value="${escapeHtml(state.queueLimitGym)}" placeholder="Например, 10">    </label>    <label class="field">      <span>Бассейн</span>      <input id="queue-limit-pool" type="number" min="1" step="1" value="${escapeHtml(state.queueLimitPool)}" placeholder="Например, 20">    </label>    <div class="actions">      <button class="btn-primary" data-action="save-queue-limits" ${state.savingQueueLimits ? "disabled" : ""}>${state.savingQueueLimits ? "Сохраняем..." : "Сохранить лимиты"}</button>    </div>  </div></section>`;

    const adminControlsSection = `<section class="card card--wide">  <p class="card__eyebrow">Управление</p>  <h2>Администраторы</h2>  <p class="section-note">Добавляйте и удаляйте администраторов по их MAX ID.</p>  <div class="admin-add-form">    <input type="text" id="new-admin-id" placeholder="MAX ID пользователя" value="${escapeHtml(state.newAdminId)}" ${state.managingAdmin ? "disabled" : ""}>    <button class="btn-primary" data-action="add-admin" ${state.managingAdmin ? "disabled" : ""}>${state.managingAdmin ? "Добавление..." : "Добавить админа"}</button>  </div>  ${state.loadingAdmins ? `<p>Загрузка списка...</p>` : `<div class="admin-list">    <h3>Текущие администраторы:</h3>    ${state.adminList.length === 0 ? `<p>Список пуст</p>` : `<ul class="admin-items">${state.adminList.map((adminId) => `      <li class="admin-item">        <span>${escapeHtml(adminId)}</span>        ${adminId === state.primaryAdminId ? `<span class="badge">Главный</span>` : state.confirmRemoveAdminId === adminId ? `<div class="actions"><button class="btn-danger btn-small" data-action="confirm-remove-admin" data-admin-id="${escapeHtml(adminId)}" ${state.managingAdmin ? "disabled" : ""}>Подтвердить удаление</button><button class="btn-secondary btn-small" data-action="cancel-remove-admin">Отмена</button></div>` : `<button class="btn-danger btn-small" data-action="start-remove-admin" data-admin-id="${escapeHtml(adminId)}" ${state.managingAdmin ? "disabled" : ""}>Удалить</button>`}      </li>`).join("")}</ul>`}  </div>`}</section>`;

    return `${reviewsSection}${applicationsSection}${queueSection}${broadcastSection}${maintenanceSection}${queueLimitsSection}${adminControlsSection}`;
  };

  function renderAdminQueueItem(item) {
    const user = item.user || {};
    const status = applicationStatusLabel(item.status);
    return `<article class="application">  <label class="checkbox-row"><input type="checkbox" data-action="toggle-queue-application" data-application-id="${escapeHtml(item.id)}" ${state.selectedQueueApplicationIds.includes(String(item.id)) ? "checked" : ""}> <span>Выбрать заявку</span></label>  <strong>${escapeHtml(user.full_name || item.full_name || "—")}</strong>  <div class="application__meta">    <span>MAX ID: ${escapeHtml(item.max_user_id || user.max_user_id || "—")}</span>    <span>Факультет: ${escapeHtml(user.faculty || item.faculty || "—")}</span>    <span>Группа: ${escapeHtml(user.group_name || item.group_name || "—")}</span>    <span>Направление: ${item.direction === "gym" ? "Спортзал" : "Бассейн"}</span>    <span>Месяц: ${escapeHtml(monthLabel(item.target_year, item.target_month))}</span>    <span>Очередь: ${escapeHtml(item.queue_position)}</span>    <span>Статус: <span class="status-chip ${escapeHtml(status.className)}">${escapeHtml(status.text)}</span></span>  </div>  <div class="actions">    <button class="btn-primary btn-small" data-action="issue-membership" data-application-id="${escapeHtml(item.id)}" ${state.issuingMembershipId ? "disabled" : ""}>${state.issuingMembershipId === item.id ? "Выдаём..." : "Выдать абонемент"}</button>  </div></article>`;
  }

  renderAdminTab = function renderAdminTabStable() {
    if (!state.session?.is_admin) {
      return `<section class="card"><p>Доступ запрещён</p></section>`;
    }

    ensureAdminExportPeriod();

    const exportPeriodOptions = state.adminExportPeriods.length
      ? state.adminExportPeriods.map((period) => {
          const value = `${period.year}-${String(period.month).padStart(2, "0")}`;
          return `<option value="${value}" ${state.adminExportPeriod === value ? "selected" : ""}>${escapeHtml(period.label)}</option>`;
        }).join("")
      : `<option value="${escapeHtml(state.adminExportPeriod || "")}">Текущий период</option>`;

    const queueMonthOptions = [`<option value="all">Все месяцы</option>`, ...Array.from(new Map(state.adminQueue.map((entry) => {
      const value = `${entry.target_year}-${String(entry.target_month).padStart(2, "0")}`;
      return [value, `<option value="${value}" ${state.adminQueueMonthFilter === value ? "selected" : ""}>${monthLabel(entry.target_year, entry.target_month)}</option>`];
    })).values())].join("");

    const queueFacultyOptions = [`<option value="all">Все факультеты</option>`, ...Array.from(new Map(state.adminQueue.map((entry) => {
      const faculty = entry.user?.faculty || entry.faculty || "";
      return faculty ? [faculty, `<option value="${escapeHtml(faculty)}" ${state.adminQueueFacultyFilter === faculty ? "selected" : ""}>${escapeHtml(faculty)}</option>`] : null;
    }).filter(Boolean)).values())].join("");

    const filteredQueue = getFilteredAdminQueue();
    const photoPreview = (url, alt) => url ? `<img class="admin-photo-thumb" src="${escapeHtml(url)}" alt="${escapeHtml(alt)}">` : `<div class="admin-photo-thumb admin-photo-thumb--empty">Нет фото</div>`;

    const rejectReasonDialog = state.rejectReasonDialogUserIds.length ? `<div class="card card--flat reject-reason-card">  <p class="card__eyebrow">Причина отклонения</p>  <h3>Выберите или укажите причину</h3>  <div class="actions">    <button class="btn-secondary btn-small" data-action="reject-reason" data-reason="Фото не прошло проверку">Фото не прошло проверку</button>    <button class="btn-secondary btn-small" data-action="reject-reason" data-reason="Документ не прошёл проверку">Документ не прошёл проверку</button>    <button class="btn-secondary btn-small" data-action="reject-reason" data-reason="Некорректная группа">Некорректная группа</button>    <button class="btn-secondary btn-small" data-action="reject-reason" data-reason="Некорректные данные">Некорректные данные</button>  </div>  <label class="field field--wide">    <span>Своя причина</span>    <textarea id="reject-custom-reason" rows="3" placeholder="Введите свою причину">${escapeHtml(state.rejectCustomReason)}</textarea>  </label>  <div class="actions">    <button class="btn-danger btn-small" data-action="submit-custom-reject-reason" ${!state.rejectCustomReason.trim() || state.verifyingUser ? "disabled" : ""}>Отклонить со своей причиной</button>    <button class="btn-secondary btn-small" data-action="cancel-reject-reason">Отмена</button>  </div></div>` : "";

    const reviewsSection = `<section class="card card--wide">  <p class="card__eyebrow">Проверка профилей</p>  <h2>Профили на проверке</h2>  ${state.pendingReviews.length ? `<div class="actions">    <button class="btn-primary btn-small" data-action="approve-selected-users" ${!state.selectedReviewUserIds.length || state.verifyingUser ? "disabled" : ""}>Одобрить выбранные</button>    <button class="btn-danger btn-small" data-action="reject-selected-users" ${!state.selectedReviewUserIds.length || state.verifyingUser ? "disabled" : ""}>Отклонить выбранные</button>    <button class="btn-secondary btn-small" data-action="delete-selected-users" ${!state.selectedReviewUserIds.length || state.managingAdmin ? "disabled" : ""}>Удалить профили</button>  </div>` : ""}  ${rejectReasonDialog}  ${state.loadingPendingReviews ? `<p>Загрузка...</p>` : state.pendingReviews.length === 0 ? `<p>Нет профилей на проверке</p>` : `<div class="admin-review-list">${state.pendingReviews.map((user) => `    <article class="application">      <label class="checkbox-row"><input type="checkbox" data-action="toggle-review-user" data-user-id="${escapeHtml(user.max_user_id)}" ${state.selectedReviewUserIds.includes(user.max_user_id) ? "checked" : ""}> <span>Выбрать профиль</span></label>      <strong>${escapeHtml(user.full_name || "Без имени")}</strong>      <div class="application__meta">        <span>Факультет: ${escapeHtml(user.faculty || "—")}</span>        <span>Группа: ${escapeHtml(user.group_name || "—")}</span>        <span>MAX ID: ${escapeHtml(user.max_user_id || "—")}</span>      </div>      <div class="admin-review-media">        ${photoPreview(user.profile_photo_url, "Фото профиля")}        ${user.profile_photo_url ? `<a class="btn-secondary btn-small" href="${escapeHtml(user.profile_photo_url)}" target="_blank" rel="noreferrer">Открыть фото</a>` : ""}        ${photoPreview(user.identity_document_url, "Документ")}        ${user.identity_document_url ? `<a class="btn-secondary btn-small" href="${escapeHtml(user.identity_document_url)}" target="_blank" rel="noreferrer">Открыть документ</a>` : ""}      </div>    </article>`).join("")}</div>`}</section>`;

    const applicationsSection = `<section class="card card--wide">  <p class="card__eyebrow">Заявки</p>  <h2>Просмотр заявок</h2>  <div class="admin-toolbar">    <label class="field">      <span>Статус</span>      <select id="admin-status-filter">        ${["queued", "approved", "issued", "cancelled"].map((status) => `          <option value="${status}" ${state.adminStatusFilter === status ? "selected" : ""}>${status === "queued" ? "В очереди" : status === "approved" ? "Одобрено" : status === "issued" ? "Выдано" : "Отменено"}</option>        `).join("")}      </select>    </label>    <label class="field">      <span>Период выгрузки</span>      <select id="admin-export-period">${exportPeriodOptions}</select>    </label>    <div class="actions">      <button class="btn-secondary" data-action="refresh-admin-applications">Обновить</button>      <button class="btn-primary" data-action="export-admin-applications-gym">Скачать спортзал</button>      <button class="btn-primary" data-action="export-admin-applications-pool">Скачать бассейн</button>    </div>  </div>  ${state.loadingAdminApplications ? `<p>Загрузка...</p>` : state.adminApplications.length === 0 ? `<p>Нет заявок</p>` : `<div class="application-list">${state.adminApplications.map((app) => `    <article class="application">      <strong>${escapeHtml(app.user?.full_name || "—")}</strong>      <div class="admin-review-media">        ${photoPreview(app.profile_photo_signed_url, "Фото профиля")}      </div>      <div class="application__meta">        <span>MAX ID: ${escapeHtml(app.max_user_id || app.user?.max_user_id || "—")}</span>        <span>Факультет: ${escapeHtml(app.user?.faculty || app.faculty || "—")}</span>        <span>Группа: ${escapeHtml(app.user?.group_name || app.group_name || "—")}</span>        <span>Направление: ${app.direction === "gym" ? "Спортзал" : "Бассейн"}</span>        <span>Месяц: ${escapeHtml(monthLabel(app.target_year, app.target_month))}</span>        <span>Очередь: ${escapeHtml(app.queue_position)}</span>      </div>    </article>`).join("")}</div>`}</section>`;

    const queueSection = `<section class="card card--wide">  <p class="card__eyebrow">Очередь</p>  <h2>Ожидают выдачи абонемента</h2>  ${filteredQueue.length ? `<div class="actions">    <button class="btn-primary btn-small" data-action="issue-selected-memberships" ${!state.selectedQueueApplicationIds.length || state.issuingMembershipId ? "disabled" : ""}>Выдать выбранные</button>  </div>` : ""}  <div class="admin-toolbar">    <label class="field">      <span>Направление</span>      <select id="admin-queue-direction-filter">        <option value="all">Все</option>        <option value="gym" ${state.adminQueueDirectionFilter === "gym" ? "selected" : ""}>Спортзал</option>        <option value="pool" ${state.adminQueueDirectionFilter === "pool" ? "selected" : ""}>Бассейн</option>      </select>    </label>    <label class="field">      <span>Месяц</span>      <select id="admin-queue-month-filter">${queueMonthOptions}</select>    </label>    <label class="field">      <span>Факультет</span>      <select id="admin-queue-faculty-filter">${queueFacultyOptions}</select>    </label>    <label class="field">      <span>Период выгрузки</span>      <select id="admin-export-period">${exportPeriodOptions}</select>    </label>    <div class="actions">      <button class="btn-secondary" data-action="refresh-admin-queue">Обновить очередь</button>      <button class="btn-primary" data-action="export-admin-queue-gym">Скачать спортзал</button>      <button class="btn-primary" data-action="export-admin-queue-pool">Скачать бассейн</button>    </div>  </div>  ${state.loadingAdminQueue ? `<p>Загрузка...</p>` : filteredQueue.length === 0 ? `<p>Очередь пуста</p>` : `<div class="application-list">${filteredQueue.map(renderAdminQueueItem).join("")}</div>`}</section>`;

    const broadcastSection = `<section class="card card--wide">  <p class="card__eyebrow">Рассылка</p>  <h2>Сообщение всем пользователям</h2>  <div class="admin-toolbar">    <label class="field field--wide">      <span>Картинка (необязательно)</span>      <input id="broadcast-image-file" type="file" accept="image/*">      ${state.broadcastImageFile ? `<span class="section-note">Выбран файл: ${escapeHtml(state.broadcastImageFile.name)}</span>` : ""}    </label>    <label class="field field--wide">      <span>Текст</span>      <textarea id="broadcast-text" rows="5" placeholder="Введите текст рассылки">${escapeHtml(state.broadcastText)}</textarea>    </label>    <div class="actions">      <button class="btn-primary" data-action="send-broadcast" ${state.sendingBroadcast ? "disabled" : ""}>${state.sendingBroadcast ? "Отправляем..." : "Запустить рассылку"}</button>    </div>  </div></section>`;

    const maintenanceSection = `<section class="card card--wide">  <p class="card__eyebrow">Техработы</p>  <h2>Пауза для пользователей</h2>  <div class="admin-toolbar">    <label class="field field--wide">      <span>Режим техработ</span>      <div class="checkbox-row">        <input id="maintenance-enabled" type="checkbox" ${state.maintenanceEnabled ? "checked" : ""}>        <span>${state.maintenanceEnabled ? "Техработы включены: пользователи увидят экран паузы" : "Техработы выключены: пользователи работают в обычном режиме"}</span>      </div>    </label>    <label class="field field--wide">      <span>Сообщение пользователю</span>      <textarea id="maintenance-message" rows="4" placeholder="Сообщение на время техработ">${escapeHtml(state.maintenanceMessage)}</textarea>    </label>    <div class="actions">      <button class="btn-primary" data-action="save-maintenance" ${state.maintenanceSaving ? "disabled" : ""}>${state.maintenanceSaving ? "Сохраняем..." : "Сохранить режим"}</button>    </div>  </div></section>`;

    const queueLimitsSection = `<section class="card card--wide">  <p class="card__eyebrow">Лимиты очереди</p>  <h2>Управление длиной очереди</h2>  <p class="section-note">Можно задать override отдельно для спортзала и бассейна. Если поле пустое, используется обычная квота из БД.</p>  <div class="admin-toolbar">    <label class="field">      <span>Спортзал</span>      <input id="queue-limit-gym" type="number" min="1" step="1" value="${escapeHtml(state.queueLimitGym)}" placeholder="Например, 10">    </label>    <label class="field">      <span>Бассейн</span>      <input id="queue-limit-pool" type="number" min="1" step="1" value="${escapeHtml(state.queueLimitPool)}" placeholder="Например, 20">    </label>    <div class="actions">      <button class="btn-primary" data-action="save-queue-limits" ${state.savingQueueLimits ? "disabled" : ""}>${state.savingQueueLimits ? "Сохраняем..." : "Сохранить лимиты"}</button>    </div>  </div></section>`;

    const adminControlsSection = `<section class="card card--wide">  <p class="card__eyebrow">Управление</p>  <h2>Администраторы</h2>  <p class="section-note">Добавляйте и удаляйте администраторов по их MAX ID.</p>  <div class="admin-add-form">    <input type="text" id="new-admin-id" placeholder="MAX ID пользователя" value="${escapeHtml(state.newAdminId)}" ${state.managingAdmin ? "disabled" : ""}>    <button class="btn-primary" data-action="add-admin" ${state.managingAdmin ? "disabled" : ""}>${state.managingAdmin ? "Добавление..." : "Добавить админа"}</button>  </div>  ${state.loadingAdmins ? `<p>Загрузка списка...</p>` : `<div class="admin-list">    <h3>Текущие администраторы:</h3>    ${state.adminList.length === 0 ? `<p>Список пуст</p>` : `<ul class="admin-items">${state.adminList.map((adminId) => `      <li class="admin-item">        <span>${escapeHtml(adminId)}</span>        ${adminId === state.primaryAdminId ? `<span class="badge">Главный</span>` : state.confirmRemoveAdminId === adminId ? `<div class="actions"><button class="btn-danger btn-small" data-action="confirm-remove-admin" data-admin-id="${escapeHtml(adminId)}" ${state.managingAdmin ? "disabled" : ""}>Подтвердить удаление</button><button class="btn-secondary btn-small" data-action="cancel-remove-admin">Отмена</button></div>` : `<button class="btn-danger btn-small" data-action="start-remove-admin" data-admin-id="${escapeHtml(adminId)}" ${state.managingAdmin ? "disabled" : ""}>Удалить</button>`}      </li>`).join("")}</ul>`}  </div>`}</section>`;

    return `${reviewsSection}${applicationsSection}${queueSection}${broadcastSection}${maintenanceSection}${queueLimitsSection}${adminControlsSection}`;
  };

  function getRenderContext() {
    const profile = state.session?.profile;
    const activeApplication = getActiveApplication();
    const verification = verificationLabel(profile?.verification_status || "not_submitted");
    const membershipAccess = canPresentMembership();

    return {
      profile,
      activeApplication,
      verification,
      membershipAccess,
    };
  }

  function buildAdminActionButtons(application) {
    if (!application?.id) return "";
    const busy = state.issuingMembershipId === application.id || state.cancellingApplicationId === application.id;
    const canCancel = application.status === "queued" || application.status === "approved" || application.status === "issued";
    return `
      <button class="btn-primary btn-small" data-action="issue-membership" data-application-id="${escapeHtml(application.id)}" ${state.issuingMembershipId ? "disabled" : ""}>${state.issuingMembershipId === application.id ? "Выдаём..." : "Выдать абонемент"}</button>
      <button class="btn-secondary btn-small" data-action="issue-membership-current" data-application-id="${escapeHtml(application.id)}" ${busy || state.issuingMembershipId ? "disabled" : ""}>${state.issuingMembershipId === application.id ? "Выдаём..." : "Выдать на текущий"}</button>
      ${canCancel ? `<button class="btn-danger btn-small" data-action="admin-cancel-application" data-application-id="${escapeHtml(application.id)}" ${busy ? "disabled" : ""}>${state.cancellingApplicationId === application.id ? "Отменяем..." : "Отменить заявку"}</button>` : ""}
    `;
  }

  function buildAdminSecondaryButtons(application) {
    if (!application?.id) return "";
    const busy = state.issuingMembershipId === application.id || state.cancellingApplicationId === application.id;
    const canCancel = application.status === "queued" || application.status === "approved" || application.status === "issued";
    return `
      <button class="btn-secondary btn-small" data-action="issue-membership-current" data-application-id="${escapeHtml(application.id)}" ${busy || state.issuingMembershipId ? "disabled" : ""}>${state.issuingMembershipId === application.id ? "Выдаём..." : "Выдать на текущий"}</button>
      ${canCancel ? `<button class="btn-danger btn-small" data-action="admin-cancel-application" data-application-id="${escapeHtml(application.id)}" ${busy ? "disabled" : ""}>${state.cancellingApplicationId === application.id ? "Отменяем..." : "Отменить заявку"}</button>` : ""}
    `;
  }

  function enhanceAdminSection(sectionTitle, applications, { appendToExistingActions = false } = {}) {
    const sections = Array.from(content.querySelectorAll("section.card.card--wide"));
    const section = sections.find((item) => item.querySelector("h2")?.textContent?.trim() === sectionTitle);
    if (!section) return;

    const cards = Array.from(section.querySelectorAll(".application-list > article.application"));
    cards.forEach((card, index) => {
      const application = applications[index];
      if (!application) return;
      let actions = card.querySelector(".actions");
      if (appendToExistingActions && actions) {
        actions.insertAdjacentHTML("beforeend", buildAdminSecondaryButtons(application));
        return;
      }
      if (!actions) {
        actions = document.createElement("div");
        actions.className = "actions";
        card.appendChild(actions);
      }
      actions.innerHTML = buildAdminActionButtons(application);
    });
  }

  function enhanceAdminButtons() {
    if (state.activeTab !== "admin" || !state.session?.is_admin) return;
    enhanceAdminSection("Просмотр заявок", state.adminApplications);
    enhanceAdminSection("Ожидают выдачи абонемента", getFilteredAdminQueue(), { appendToExistingActions: true });
  }

  function renderActiveTab() {
    const { profile, activeApplication, verification, membershipAccess } = getRenderContext();

    if (state.activeTab === "home") {
      return renderHomeTab(profile, activeApplication, verification, membershipAccess);
    }
    if (state.activeTab === "application") {
      return renderApplicationTab(profile);
    }
    if (state.activeTab === "schedule") {
      return renderScheduleTab();
    }
    if (state.activeTab === "admin") {
      return renderAdminTab();
    }
    return renderProfileTab();
  }

  function render() {
    if (!isConfigured()) {content.innerHTML = `  <div class="error-screen">    <h2>Ошибка конфигурации</h2>    <p>Mini-app не настроен</p>    <p class="section-note">Проверьте опубликованный config.js. В нём должен быть задан apiBaseUrl.</p>  </div>`;return;
    }

    if (state.loading || !state.session) {
      content.innerHTML = `  <section class="card">    <p class="card__eyebrow">Загрузка</p>    <h2>Подгружаем профиль и очередь</h2>    <p>Подождите несколько секунд.</p>  </section>`;
      return;
    }

    if (state.session.subscription_ok === false) {
      const links = state.session.missing_required_channels || ["https://max.ru/poezdatiy", "https://max.ru/id5402113155_gos"];
      content.innerHTML = `  <section class="card">    <p class="card__eyebrow">Доступ ограничен</p>    <h2>Подпишитесь на обязательные каналы</h2>    <p>Для работы бота и mini-app нужна подписка на оба канала. После подписки закройте и заново откройте mini-app.</p>    <div class="actions">      <a class="btn-primary" href="${escapeHtml(links[0] || "https://max.ru/poezdatiy")}" target="_blank" rel="noreferrer">Первый Профсоюзный</a>      <a class="btn-secondary" href="${escapeHtml(links[1] || "https://max.ru/id5402113155_gos")}" target="_blank" rel="noreferrer">Новости СГУПС</a>    </div>  </section>`;
      return;
    }

    if (state.session.maintenance_enabled && !state.session.is_admin) {
      content.innerHTML = `  <section class="card">    <p class="card__eyebrow">Технические работы</p>    <h2>Сервис временно недоступен</h2>    <p>${escapeHtml(state.session.maintenance_message || "Проводятся технические работы. Попробуйте позже.")}</p>  </section>`;
      return;
    }

    content.innerHTML = `${renderTabs()}${renderActiveTab()}${renderMembershipModal()}`;
    enhanceAdminButtons();
  }

  function handleContentClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;

    if (action === "close-membership" && target.classList.contains("modal-overlay") && event.target !== target) {
      return;
    }

    if (action === "dismiss-alert") {
      dismissAlert(target.dataset.id);
      return;
    }

    switch (action) {
      case "switch-tab":
        state.activeTab = target.dataset.tab;
        if (state.activeTab === "home" && !state.poolScheduleDay && !state.loadingSchedule) {
          state.scheduleEntryPoint = "pool";
          void ensurePoolScheduleLoaded();
        }
        if (state.activeTab === "admin" && state.session?.is_admin) {
          void ensureAdminDataLoaded();
        }
        render();
        return;
      case "open-schedule-hub":
        state.activeTab = "schedule";
        state.scheduleEntryPoint = null;
        render();
        return;
      case "open-schedule-entry":
        state.scheduleEntryPoint = target.dataset.entry || null;
        render();
        if (state.scheduleEntryPoint === "pool") {
          void ensurePoolScheduleLoaded();
        }
        return;
      case "back-to-schedule-menu":
        state.scheduleEntryPoint = null;
        render();
        return;
      case "set-schedule-pool":
        if (state.poolSchedulePool !== target.dataset.pool) {
          state.poolSchedulePool = target.dataset.pool || "big";
          void ensurePoolScheduleLoaded();
        }
        return;
      case "set-schedule-day":
        state.poolScheduleDay = target.dataset.day || null;
        render();
        return;
      case "reset-schedule-filter":
        state.poolScheduleMinFreeLanes = 0;
        render();
        return;
      case "toggle-doc-help":
        state.showDocumentHelp = !state.showDocumentHelp;
        render();
        return;
      case "save-profile":
        void saveProfile();
        return;
      case "confirm-profile-save":
        void saveProfile();
        return;
      case "cancel-profile-save":
        state.confirmProfileSave = false;
        render();
        return;
      case "submit-review":
        void submitReview();
        return;
      case "start-delete-profile":
        state.showDeleteConfirm = true;
        render();
        return;
      case "cancel-delete-profile":
        state.showDeleteConfirm = false;
        render();
        return;
      case "confirm-delete-profile":
        void deleteProfile();
        return;
      case "preview-application":
        void previewApplication(target.dataset.direction);
        return;
      case "clear-application-confirm":
        state.confirmApplication = null;
        render();
        return;
      case "confirm-application":
        void createApplication();
        return;
      case "cancel-application":
        void cancelApplication(Number(target.dataset.id));
        return;
      case "open-membership":
        if (canPresentMembership().ok) {
          state.membershipModalOpen = true;
          startMembershipTimer();
          render();
        }
        return;
      case "close-membership":
        closeMembership();
        render();
        return;
      case "toggle-theme":
        toggleTheme();
        return;
      case "set-debug-date":
        void persistDebugToday(target.dataset.date || "");
        return;
      case "clear-debug-date":
        void persistDebugToday("");
        return;
      case "fill-queue":
        void fillQueue(target.dataset.direction, target.dataset.scope);
        return;
      case "clear-debug-queue":
        void clearQueue();
        return;
      case "add-admin":
        void addAdmin();
        return;
      case "start-remove-admin":
        state.confirmRemoveAdminId = target.dataset.adminId || "";
        render();
        return;
      case "cancel-remove-admin":
        state.confirmRemoveAdminId = "";
        render();
        return;
      case "confirm-remove-admin":
        void removeAdmin(target.dataset.adminId);
        return;
      case "remove-admin":
        void removeAdmin(target.dataset.adminId);
        return;
      case "refresh-admin-applications":
        void loadAdminApplications();
        return;
      case "refresh-admin-queue":
        void loadAdminQueue();
        return;
      case "issue-membership":
        void issueMembership(Number(target.dataset.applicationId));
        return;
      case "issue-membership-current":
        void issueMembershipCurrent(Number(target.dataset.applicationId));
        return;
      case "admin-cancel-application":
        void adminCancelApplication(Number(target.dataset.applicationId));
        return;
      case "send-broadcast":
        void sendBroadcast();
        return;
      case "save-maintenance":
        void saveMaintenance();
        return;
      case "save-queue-limits":
        void saveQueueLimits();
        return;
      case "export-admin-applications-gym":
        void downloadAdminExport("gym");
        return;
      case "export-admin-applications-pool":
        void downloadAdminExport("pool");
        return;
      case "export-admin-queue-gym":
        void downloadAdminExport("gym");
        return;
      case "export-admin-queue-pool":
        void downloadAdminExport("pool");
        return;
      case "approve-user":
        void verifyUser(target.dataset.userId, "approved");
        return;
      case "reject-user":
        state.rejectReasonDialogUserIds = [target.dataset.userId];
        state.rejectCustomReason = "";
        render();
        return;
      case "toggle-review-user": {
        const userId = target.dataset.userId || "";
        state.selectedReviewUserIds = state.selectedReviewUserIds.includes(userId)
          ? state.selectedReviewUserIds.filter((item) => item !== userId)
          : [...state.selectedReviewUserIds, userId];
        render();
        return;
      }
      case "toggle-queue-application": {
        const applicationId = target.dataset.applicationId || "";
        state.selectedQueueApplicationIds = state.selectedQueueApplicationIds.includes(applicationId)
          ? state.selectedQueueApplicationIds.filter((item) => item !== applicationId)
          : [...state.selectedQueueApplicationIds, applicationId];
        render();
        return;
      }
      case "approve-selected-users":
        void verifyUsers(state.selectedReviewUserIds, "approved");
        return;
      case "reject-selected-users":
        state.rejectReasonDialogUserIds = [...state.selectedReviewUserIds];
        state.rejectCustomReason = "";
        render();
        return;
      case "delete-selected-users":
        void deleteUsers(state.selectedReviewUserIds);
        return;
      case "issue-selected-memberships":
        void issueMemberships(state.selectedQueueApplicationIds.map((item) => Number(item)).filter((item) => item > 0));
        return;
      case "cancel-reject-reason":
        state.rejectReasonDialogUserIds = [];
        state.rejectCustomReason = "";
        render();
        return;
      case "reject-reason": {
        const reason = target.dataset.reason || "";
        if (reason === "custom") {
          render();
          return;
        }
        void verifyUsers(state.rejectReasonDialogUserIds, "rejected", reason);
        return;
      }
      case "submit-custom-reject-reason":
        if (state.rejectCustomReason.trim()) {
          void verifyUsers(state.rejectReasonDialogUserIds, "rejected", state.rejectCustomReason.trim());
        }
        return;
      default:
        return;
    }
  }

  function handleInput(event) {
    const field = event.target.dataset.field;
    if (field) {
      state.profileForm[field] = event.target.value;
      if (state.fieldErrors[field]) {
        delete state.fieldErrors[field];
        render();
      }
    }

    if (event.target.id === "new-admin-id") {
      state.newAdminId = event.target.value;
      return;
    }

    if (event.target.id === "admin-status-filter") {
      state.adminStatusFilter = event.target.value;
      void loadAdminApplications();
      return;
    }

    if (event.target.id === "admin-directory-category") {
      state.adminDirectoryCategory = event.target.value;
      render();
      return;
    }

    if (event.target.id === "admin-queue-direction-filter") {
      state.adminQueueDirectionFilter = event.target.value;
      render();
      return;
    }

    if (event.target.id === "admin-queue-faculty-filter") {
      state.adminQueueFacultyFilter = event.target.value;
      render();
      return;
    }

    if (event.target.id === "broadcast-text") {
      state.broadcastText = event.target.value;
      return;
    }

    if (event.target.id === "broadcast-image-url") {
      return;
    }

    if (event.target.id === "maintenance-message") {
      state.maintenanceMessage = event.target.value;
      return;
    }

    if (event.target.id === "reject-custom-reason") {
      state.rejectCustomReason = event.target.value;
      return;
    }

    if (event.target.id === "queue-limit-gym") {
      state.queueLimitGym = event.target.value;
      return;
    }

    if (event.target.id === "queue-limit-pool") {
      state.queueLimitPool = event.target.value;
    }
  }

  function handleChange(event) {
    const field = event.target.dataset.field;
    if (field) {
      state.profileForm[field] = event.target.value;
      if (state.fieldErrors[field]) {
        delete state.fieldErrors[field];
        render();
      }
      return;
    }

    const action = event.target.dataset.action;
    const file = event.target.files?.[0];
    if (!file) return;

    if (action === "upload-document") {
      void uploadDocument(file);
      event.target.value = "";
      return;
    }

    if (action === "upload-profile-photo") {
      void uploadProfilePhoto(file);
      event.target.value = "";
      return;
    }

    if (event.target.id === "admin-export-period") {
      state.adminExportPeriod = event.target.value;
      return;
    }

    if (event.target.id === "admin-queue-month-filter") {
      state.adminQueueMonthFilter = event.target.value;
      render();
      return;
    }

    if (event.target.id === "schedule-lane-filter") {
      state.poolScheduleMinFreeLanes = Number(event.target.value || 0);
      render();
      return;
    }

    if (event.target.id === "maintenance-enabled") {
      state.maintenanceEnabled = event.target.checked;
      render();
      return;
    }

    if (event.target.id === "broadcast-image-file") {
      state.broadcastImageFile = event.target.files?.[0] || null;
      render();
    }
  }

  async function bootstrap() {
    initTheme();
    applyTheme();
    
    state.initData = await resolveInitData();
    state.apiBaseUrl = String(window.MiniAppConfig?.apiBaseUrl || "").trim();
    document.addEventListener("click", handleContentClick);
    document.addEventListener("input", handleInput);
    document.addEventListener("change", handleChange);

    if (!state.initData) {
      const diagnostics = collectInitDataDiagnostics();
      console.warn("MAX initData is missing", diagnostics);
      pushAlert(
        "error",
        "MAX не передал initData",
        `Откройте mini-app через новую кнопку бота. Bridge: ${diagnostics.hasBridgeWebApp ? "ok" : "нет"}, search: ${diagnostics.searchParams.join(", ") || "пусто"}, hash: ${diagnostics.hashParams.join(", ") || "пусто"}.`,
      );
      state.loading = false;
      render();
      return;
    }

    if (!isConfigured()) {
      state.loading = false;
      render();
      return;
    }

    await loadSession();
  }

  async function ensurePoolIndexLoaded() {
    if (state.poolScheduleIndex.length) return;
    if (poolIndexPromise) {
      await poolIndexPromise;
      return;
    }

    poolIndexPromise = loadPoolIndex();
    await poolIndexPromise;
  }

  async function loadPoolIndex() {
    try {
      const text = await fetchText(`https://docs.google.com/spreadsheets/d/${POOL_SHEET_ID}/export?format=csv&gid=${POOL_INDEX_GID}`);
      state.poolScheduleIndex = parseCSV(text).slice(1).reduce((acc, row) => {
        if (!row[0]) return acc;
        acc.push({
          month: String(row[0]).trim(),
          big: row[1] ? Number(row[1]) : null,
          small: row[2] ? Number(row[2]) : null,
        });
        return acc;
      }, []);
    } catch (error) {
      console.warn("Pool schedule index load failed, using fallback schedules", error);
      state.poolScheduleIndex = [];
    }
  }

  async function ensurePoolScheduleLoaded() {
    state.loadingSchedule = true;
    state.scheduleError = "";
    render();

    try {
      await ensurePoolIndexLoaded();
      const currentMonth = getScheduleTitle().replace("Расписание бассейна на ", "").toLowerCase();
      const entry = state.poolScheduleIndex.find((item) => item.month.toLowerCase() === currentMonth);
      const gid = entry?.[state.poolSchedulePool];
      const rows = await loadPoolScheduleRows(state.poolSchedulePool, gid);
      state.poolScheduleParsed = parsePoolSchedule(rows);
      state.poolScheduleDay = state.poolScheduleParsed[getPoolToday()] ? getPoolToday() : Object.keys(state.poolScheduleParsed)[0] || null;
      state.scheduleError = state.poolScheduleDay ? "" : "Нет данных для отображения.";
    } catch (error) {
      state.poolScheduleParsed = {};
      state.poolScheduleDay = null;
      state.scheduleError = error?.message ? String(error.message) : "Не удалось загрузить расписание.";
    } finally {
      state.loadingSchedule = false;
      render();
    }
  }

  async function loadPoolScheduleRows(pool, gid) {
    if (gid) {
      try {
        const text = await fetchText(`https://docs.google.com/spreadsheets/d/${POOL_SHEET_ID}/export?format=csv&gid=${gid}`);
        return parseCSV(text);
      } catch (error) {
        console.warn(`Pool schedule remote load failed for ${pool}`, error);
      }
    }

    const fallbackPath = POOL_FALLBACK_SCHEDULES[pool];
    const inlineFallback = POOL_INLINE_FALLBACK_CSV[pool];

    if (inlineFallback) {
      return parseCSV(inlineFallback);
    }

    if (!fallbackPath) {
      throw new Error("Локальное расписание не настроено.");
    }

    const fallbackText = await fetchText(fallbackPath);
    return parseCSV(fallbackText);
  }

  async function fetchText(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.text();
  }

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let value = "";
    let inQuotes = false;
    const normalizedText = String(text || "").replace(/^\uFEFF/, "");

    for (let index = 0; index < normalizedText.length; index++) {
      const char = normalizedText[index];
      const nextChar = normalizedText[index + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          value += '"';
          index++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === "," && !inQuotes) {
        row.push(value);
        value = "";
        continue;
      }

      if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && nextChar === "\n") {
          index++;
        }

        row.push(value);
        if (row.some((cell) => cell.length > 0)) {
          rows.push(row);
        }
        row = [];
        value = "";
        continue;
      }

      value += char;
    }

    row.push(value);
    if (row.some((cell) => cell.length > 0)) {
      rows.push(row);
    }

    return rows;
  }

  function parsePoolSchedule(rows) {
    const result = {};
    const timeRow = rows.findIndex((row) => row.some((cell) => isPoolTimeHeaderCell(cell)));
    if (timeRow === -1) return result;

    const timeColumns = [];
    const times = [];
    rows[timeRow].forEach((cell, index) => {
      if (!isPoolTimeRange(cell)) return;
      timeColumns.push(index);
      times.push(normalizePoolCell(cell));
    });

    if (!times.length) return result;

    for (let i = timeRow + 1; i < rows.length; i++) {
      const row = rows[i];
      const day = getPoolDayName(row);
      if (!row || !day) continue;

      result[day] = times.map((time) => ({ time, lanes: [] }));
      let cursor = i;

      while (rows[cursor] && (cursor === i || !getPoolDayName(rows[cursor]))) {
        const lane = getPoolLaneNumber(rows[cursor]);
        if (lane !== null) {
          timeColumns.forEach((column, slotIndex) => {
            const cell = rows[cursor][column];
            result[day][slotIndex].lanes.push({
              lane,
              busy: Boolean(cell && String(cell).trim()),
            });
          });
        }
        cursor++;
      }

      i = cursor - 1;
    }

    return result;
  }

  function normalizePoolCell(value) {
    return String(value || "").trim();
  }

  function normalizePoolKey(value) {
    return normalizePoolCell(value).toLowerCase().replace(/\s+/g, " ");
  }

  function isPoolTimeRange(value) {
    return /\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}/.test(normalizePoolCell(value));
  }

  function isPoolTimeHeaderCell(value) {
    const normalized = normalizePoolKey(value);
    return normalized.includes("время") || isPoolTimeRange(value);
  }

  function getPoolDayName(row) {
    if (!row) return null;
    for (const cell of row) {
      const day = POOL_DAYS.find((name) => normalizePoolKey(cell) === name.toLowerCase());
      if (day) return day;
    }
    return null;
  }

  function getPoolLaneNumber(row) {
    if (!row) return null;
    for (const cell of row) {
      const normalized = normalizePoolCell(cell);
      if (!/^\d{1,2}$/.test(normalized)) continue;
      const lane = Number(normalized);
      if (lane > 0 && lane <= 20) return lane;
    }
    return null;
  }

  function getPoolToday() {
    const dayIndex = new Date().getDay();
    return POOL_DAYS[dayIndex === 0 ? 6 : dayIndex - 1];
  }

  function isNowInRange(timeRange) {
    const now = new Date();
    const [start, end] = timeRange.split("-").map((value) => {
      const [hours, minutes] = value.split(":").map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    });
    return now >= start && now <= end;
  }

  void bootstrap();
})();














