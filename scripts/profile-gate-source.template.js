import { validatePreAssessmentState } from '__STATE_DATA_URL__';

const ROLE_OPTIONS = [
  ['founder_controller', '创始人／实际控制人'],
  ['owner_chair', '老板／董事长'],
  ['ceo_president_gm', 'CEO／总裁／总经理'],
  ['cofounder_partner', '联合创始人／合伙人'],
  ['business_unit_owner', '事业部／业务单元负责人'],
  ['cxo_core_executive', 'CXO／核心高管'],
  ['middle_manager', '中层管理者'],
  ['professional_advisor', '专业顾问'],
  ['other', '其他']
];

const REVENUE_OPTIONS = [
  ['lt_10m_cny', '1,000 万元以下'],
  ['10m_30m_cny', '1,000 万—3,000 万元'],
  ['30m_100m_cny', '3,000 万—1 亿元'],
  ['100m_300m_cny', '1 亿—3 亿元'],
  ['300m_1b_cny', '3 亿—10 亿元'],
  ['gte_1b_cny', '10 亿元及以上'],
  ['prefer_not_to_say', '不便透露']
];

const HEADCOUNT_OPTIONS = [
  ['lt_10', '10 人以下'],
  ['10_30', '10—30 人'],
  ['30_100', '30—100 人'],
  ['100_300', '100—300 人'],
  ['300_1000', '300—1,000 人'],
  ['gte_1000', '1,000 人及以上'],
  ['prefer_not_to_say', '不便透露']
];

const FIELD_CONTROL_IDS = {
  currentlyOperatingBusiness: 'eligibility-operating',
  participatesInKeyBusinessDecisions: 'eligibility-decisions',
  canReferenceRecent6Months: 'eligibility-six-months',
  usesConsistentBusinessReference: 'eligibility-reference',
  displayName: 'profile-display-name',
  businessUnit: 'profile-business-unit',
  roleCode: 'profile-role-code',
  roleOther: 'profile-role-other',
  revenueBand: 'profile-revenue-band',
  headcountBand: 'profile-headcount-band',
  industryOther: 'profile-industry-other',
  reportProcessing: 'consent-report-processing'
};

function selectedOptions(options, selected) {
  return options.map(([value, label]) =>
    `<option value="${value}" ${selected === value ? 'selected' : ''}>${label}</option>`
  ).join('');
}

function checked(value) {
  return value ? 'checked' : '';
}

export function renderEligibilityGate(container, instrument, state, dispatch) {
  const profile = state.assessmentProfile;
  const eligibility = state.eligibility;
  const consents = state.consents;
  container.innerHTML = `
    <main class="shell shell--narrow">
      <header class="brand-row"><span class="brand-dot"></span><span>富老板 BSTI</span></header>
      <section class="hero-card">
        <p class="eyebrow">商业系统张力测量工具</p>
        <h1>看见你的商业系统张力，先从真实经营状态开始。</h1>
        <p class="lead">${instrument.eligibility.statement}</p>
        <p class="demo-notice">当前为开发演示环境，请勿填写真实个人或企业资料。</p>
        <form class="profile-form" id="pre-assessment-form" novalidate>
          <section class="profile-block">
            <h2>作答身份与参照确认</h2>
            <p class="profile-block-intro">请以最近六个月、同一个企业或业务单元作为本次作答参照。</p>
            <div class="confirmation-list">
              <label class="check-row"><input id="eligibility-operating" type="checkbox" ${checked(eligibility.currentlyOperatingBusiness)}><span>我目前正在经营或参与经营企业／业务单元。</span></label>
              <label class="check-row"><input id="eligibility-decisions" type="checkbox" ${checked(eligibility.participatesInKeyBusinessDecisions)}><span>我参与该企业／业务单元的重要经营判断。</span></label>
              <label class="check-row"><input id="eligibility-six-months" type="checkbox" ${checked(eligibility.canReferenceRecent6Months)}><span>我能够以最近六个月作为统一作答参照。</span></label>
              <label class="check-row"><input id="eligibility-reference" type="checkbox" ${checked(eligibility.usesConsistentBusinessReference)}><span>本次作答将始终以同一个企业／业务单元为参照。</span></label>
            </div>
            <div class="profile-field profile-field--full">
              <label for="profile-business-unit">公司／主要经营主体</label>
              <input id="profile-business-unit" class="text-input" type="text" autocomplete="organization" value="${escapeHtml(profile.businessUnit)}" placeholder="例如：公司、品牌、事业部或主要经营主体">
            </div>
          </section>

          <section class="profile-block">
            <h2>身份与企业资料</h2>
            <p class="profile-block-intro">以下资料用于固定本次作答情境、生成并保存报告，并帮助你结合真实经营语境理解测试结果。上述资料不改变 BSTI 计分结果，但会用于 BSTM 报告的情境化解读与后续研究验证。</p>
            <div class="profile-grid">
              <div class="profile-field">
                <label for="profile-display-name">姓名／称呼</label>
                <input id="profile-display-name" class="text-input" type="text" autocomplete="name" value="${escapeHtml(profile.displayName)}">
                <small>用于生成、保存和识别你的专属报告。</small>
              </div>
              <div class="profile-field">
                <label for="profile-role-code">当前角色</label>
                <select id="profile-role-code" class="select-input">
                  <option value="">请选择</option>
                  ${selectedOptions(ROLE_OPTIONS, profile.roleCode)}
                </select>
                <small>不同角色接触的信息、承担的责任与拥有的决策权限不同，也会形成不同的经营观察视角。</small>
              </div>
              <div class="profile-field profile-field--full" id="profile-role-other-wrap" ${profile.roleCode === 'other' ? '' : 'hidden'}>
                <label for="profile-role-other">其他角色</label>
                <input id="profile-role-other" class="text-input" type="text" value="${escapeHtml(profile.roleOther)}">
              </div>
              <div class="profile-field">
                <label for="profile-revenue-band">年营收规模</label>
                <select id="profile-revenue-band" class="select-input">
                  <option value="">请选择</option>
                  ${selectedOptions(REVENUE_OPTIONS, profile.revenueBand)}
                </select>
                <small>营收规模反映企业正在承载的交易、客户、资金与业务链条复杂度，用于理解系统张力所处的经营语境。</small>
              </div>
              <div class="profile-field">
                <label for="profile-headcount-band">组织人数</label>
                <select id="profile-headcount-band" class="select-input">
                  <option value="">请选择</option>
                  ${selectedOptions(HEADCOUNT_OPTIONS, profile.headcountBand)}
                </select>
                <small>组织人数会影响协作节点、信息传递、授权关系与管理层级，用于理解系统张力可能如何在组织中显现。</small>
              </div>
              <div class="profile-field profile-field--full">
                <label for="profile-industry-other">所属行业</label>
                <input id="profile-industry-other" class="text-input" type="text" value="${escapeHtml(profile.industryOther)}" placeholder="请填写主要所属行业">
                <small>不同行业具有不同的业务周期、交付结构、人员配置与外部约束，用于辅助理解相同张力在不同经营现场的表现。</small>
              </div>
            </div>
          </section>

          <section class="consent-panel">
            <p class="profile-block-intro">万商万才将使用你填写的身份与企业资料、本次作答及报告结果，完成 BSTI 测试、生成和保存 BSTM 报告，并在你主动选择时提供报告解读。具体处理方式、保存期限和权利行使方法，请查看《BSTI 个人信息处理规则》；测试与报告的适用边界，请查看《BSTI 测试与报告使用说明》。</p>
            <label class="check-row"><input id="consent-report-processing" type="checkbox" ${checked(consents.reportProcessing)}><span>我已阅读并同意《BSTI 个人信息处理规则》，同意万商万才处理上述资料及本次作答，用于完成测试、生成和保存 BSTM 报告。</span></label>
            <label class="check-row"><input id="consent-marketing" type="checkbox" ${checked(consents.marketing)}><span>我愿意接收与本次报告相关的解读、活动和服务信息，并知悉可以随时取消。</span></label>
          </section>

          <p class="validation-message" id="profile-validation-message" hidden>请完成必填资料与确认。</p>
          <button class="button button--primary button--full" id="profile-continue" type="submit">确认资料，开始测试</button>
        </form>
      </section>
      <p class="footnote">请依据最近六个月的真实经营情况作答。BSTI 不用于人格定型、心理诊断或自动作出经营结论。</p>
    </main>`;

  let currentState = state;
  const setEligibility = (id, field) => {
    const control = container.querySelector(`#${id}`);
    control.addEventListener('change', () => {
      currentState = dispatch({ type: 'SET_ELIGIBILITY', field, value: control.checked });
      control.classList.remove('is-invalid');
    });
  };
  const setProfile = (id, field, eventName = 'input') => {
    const control = container.querySelector(`#${id}`);
    control.addEventListener(eventName, () => {
      currentState = dispatch({ type: 'SET_PROFILE', field, value: control.value });
      control.classList.remove('is-invalid');
    });
    return control;
  };
  const setConsent = (id, field) => {
    const control = container.querySelector(`#${id}`);
    control.addEventListener('change', () => {
      currentState = dispatch({ type: 'SET_CONSENT', field, value: control.checked });
      control.classList.remove('is-invalid');
    });
  };

  setEligibility('eligibility-operating', 'currentlyOperatingBusiness');
  setEligibility('eligibility-decisions', 'participatesInKeyBusinessDecisions');
  setEligibility('eligibility-six-months', 'canReferenceRecent6Months');
  setEligibility('eligibility-reference', 'usesConsistentBusinessReference');
  setProfile('profile-display-name', 'displayName');
  setProfile('profile-business-unit', 'businessUnit');
  const roleCode = setProfile('profile-role-code', 'roleCode', 'change');
  setProfile('profile-role-other', 'roleOther');
  setProfile('profile-revenue-band', 'revenueBand', 'change');
  setProfile('profile-headcount-band', 'headcountBand', 'change');
  setProfile('profile-industry-other', 'industryOther');
  setConsent('consent-report-processing', 'reportProcessing');
  setConsent('consent-marketing', 'marketing');

  roleCode.addEventListener('change', () => {
    container.querySelector('#profile-role-other-wrap').hidden = roleCode.value !== 'other';
  });

  container.querySelector('#pre-assessment-form').addEventListener('submit', (event) => {
    event.preventDefault();
    container.querySelectorAll('.is-invalid').forEach((element) => element.classList.remove('is-invalid'));
    const validation = validatePreAssessmentState(currentState);
    const message = container.querySelector('#profile-validation-message');
    if (!validation.valid) {
      message.hidden = false;
      const controlId = FIELD_CONTROL_IDS[validation.firstInvalidField];
      const control = controlId ? container.querySelector(`#${controlId}`) : null;
      if (control) {
        control.classList.add('is-invalid');
        control.focus({ preventScroll: true });
        control.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      return;
    }
    message.hidden = true;
    dispatch({ type: 'CONFIRM_PROFILE' });
  });
}

export function renderIntro(container, instrument, dispatch) {
  container.innerHTML = `
    <main class="shell shell--narrow">
      <header class="brand-row"><span class="brand-dot"></span><span>富老板 BSTI</span></header>
      <section class="hero-card">
        <p class="eyebrow">作答说明</p>
        <h1>40题，约8—10分钟。</h1>
        <p class="lead">${instrument.instructions.intro}</p>
        <div class="instruction-grid">
          <div><span class="step-number">01</span><p>每页5题，共8页；每页完成后才可继续。</p></div>
          <div><span class="step-number">02</span><p>请选择最符合当前实际情况的答案，不必寻找“正确答案”。</p></div>
          <div><span class="step-number">03</span><p>提交前可返回任意页面修改。</p></div>
        </div>
        <button class="button button--primary button--full" id="start-assessment">开始作答</button>
      </section>
    </main>`;
  container.querySelector('#start-assessment').addEventListener('click', () => dispatch({ type: 'START_ASSESSMENT' }));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}
