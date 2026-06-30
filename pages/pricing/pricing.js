(function () {
    'use strict';

    // ── Constants ──────────────────────────────────────────────────────
    var DEV_PRICE     = 9;
    var BIZ_START     = 7.50;
    var FLOOR         = DEV_PRICE * 0.50;   // €4.50
    var ENT_THRESHOLD = 100;
    var SH_MONTHLY    = 400;
    var SH_ANNUAL     = SH_MONTHLY * 10;    // €4.000/año
    var MONTHS_ANNUAL = 10;
    var SLOPE         = (BIZ_START - FLOOR) / (ENT_THRESHOLD - 1);

    function t(key) { return window.i18n ? window.i18n.t(key) : ''; }

    function fmt(num) {
        var r = Math.round(num * 100) / 100;
        return '€' + (r % 1 === 0 ? r.toFixed(0) : r.toFixed(2).replace('.', ','));
    }

    function fmtInt(num) {
        return '€' + Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    function ppl(n) {
        if (n <= 0) return 0;
        if (n === 1) return DEV_PRICE;
        return Math.max(FLOOR, BIZ_START - SLOPE * (n - 1));
    }

    // ── Page billing toggle (for Developer card annual note) ───────────
    var pageBtnMonthly   = document.getElementById('toggle-monthly');
    var pageBtnAnnual    = document.getElementById('toggle-annual');
    var pageAnnualNotes  = document.querySelectorAll('.pr-annual-note');
    var pagePriceMonthly = document.querySelectorAll('.pr-price-monthly');
    var pagePriceAnnual  = document.querySelectorAll('.pr-price-annual');

    function setPageMode(annual) {
        pageBtnMonthly.classList.toggle('active', !annual);
        pageBtnAnnual.classList.toggle('active', annual);
        pageAnnualNotes.forEach(function (el) { el.hidden = !annual; });
        pagePriceMonthly.forEach(function (el) { el.hidden = annual; });
        pagePriceAnnual.forEach(function (el) { el.hidden = !annual; });
    }

    pageBtnMonthly.addEventListener('click', function () { setPageMode(false); });
    pageBtnAnnual.addEventListener('click',  function () { setPageMode(true); });

    // ── BYOK note (innerHTML for <strong>) ────────────────────────────
    function applyByok() {
        var el = document.getElementById('byok-note');
        if (el && window.i18n) el.innerHTML = window.i18n.t('pricing.byok_note');
    }

    // ── Plan data ──────────────────────────────────────────────────────
    var PLANS = {
        free:       { nameKey: 'plan_free',    benefits: ['svc_managed', 'svc_updates'],                                                                                              supportKey: 'svc_community',      ctaType: 'free' },
        rookie:     { nameKey: 'plan_starter', benefits: ['svc_managed', 'svc_updates', 'svc_groups', 'svc_training_basic'],                                                          supportKey: 'svc_community',      ctaType: 'free' },
        developer:  { nameKey: 'plan_dev',     benefits: ['svc_managed', 'svc_updates', 'svc_groups', 'svc_backups', 'svc_training_mid'],                                             supportKey: 'svc_support_direct', ctaType: 'plan_dev' },
        business:   { nameKey: 'plan_biz',     benefits: ['svc_managed', 'svc_updates', 'svc_groups', 'svc_backups', 'svc_admin_panel', 'svc_onboarding', 'svc_discounts_training'], supportKey: 'svc_support_direct', ctaType: 'plan_biz' },
        enterprise: { nameKey: 'plan_ent',     benefits: ['svc_managed', 'svc_updates', 'svc_groups', 'svc_backups', 'svc_admin_panel', 'svc_onboarding', 'svc_discounts_training'], supportKey: 'svc_support_direct', ctaType: 'plan_ent' }
    };

    var pmTierAt1 = 'developer'; // which plan to show when n=1

    function planForN(n) {
        if (n <= 0)             return 'free';
        if (n === 1)            return pmTierAt1;
        if (n <= ENT_THRESHOLD) return 'business';
        return 'enterprise';
    }

    // ── Plan modal ─────────────────────────────────────────────────────
    var pmAnnual    = false;
    var pmSh        = false;
    var pmLic       = 1;
    var pmPlan      = 'developer';
    var pmAnimating = false;
    var pmTimer     = null;

    var pmOverlay    = document.getElementById('plan-modal');
    var pmCloseBtn   = document.getElementById('pm-close');
    var pmSlider     = document.getElementById('pm-slider');
    var pmCountEl    = document.getElementById('pm-count');
    var pmPlanCard   = document.getElementById('pm-plan-card');
    var pmPlanNameEl = document.getElementById('pm-plan-name');
    var pmBenefitsEl = document.getElementById('pm-benefits');
    var pmMonthlyBtn = document.getElementById('pm-toggle-monthly');
    var pmAnnualBtn  = document.getElementById('pm-toggle-annual');
    var pmShCheck    = document.getElementById('pm-sh-check');
    var pmShNote     = document.getElementById('pm-sh-note');
    var pmPplEl       = document.getElementById('pm-ppl');
    var pmMonthlyRow  = document.querySelector('.pm-total-monthly');
    var pmMonthlyEl   = document.getElementById('pm-monthly');
    var pmAnnualRow   = document.getElementById('pm-annual-row');
    var pmAnnualEl   = document.getElementById('pm-annual');
    var pmSavingsEl  = document.getElementById('pm-savings');
    var pmCtaBtn     = document.getElementById('pm-cta');

    var pmZoneEls = {
        developer:  document.getElementById('pz-dev'),
        business:   document.getElementById('pz-biz'),
        enterprise: document.getElementById('pz-ent')
    };

    var pmTierToggle  = document.getElementById('pm-tier-toggle');
    var pmTierBtnEls  = { rookie: document.getElementById('pt-rookie'), developer: document.getElementById('pt-soldier') };

    function showTierToggle(show) {
        pmTierToggle.hidden = !show;
    }

    function updateTierHighlight() {
        var key = (pmTierAt1 === 'rookie') ? 'rookie' : 'developer';
        Object.keys(pmTierBtnEls).forEach(function (k) {
            pmTierBtnEls[k].classList.toggle('pm-tier-btn--active', k === key);
        });
    }

    // Open / close
    function openPlanModal() {
        pmOverlay.hidden = false;
        document.body.style.overflow = 'hidden';
    }

    function closePlanModal() {
        pmOverlay.hidden = true;
        document.body.style.overflow = '';
    }

    document.getElementById('open-plan-modal').addEventListener('click', openPlanModal);
    pmCloseBtn.addEventListener('click', closePlanModal);
    pmOverlay.addEventListener('click', function (e) { if (e.target === pmOverlay) closePlanModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pmOverlay.hidden) closePlanModal(); });

    // Zone tabs
    Object.keys(pmZoneEls).forEach(function (key) {
        pmZoneEls[key].addEventListener('click', function () {
            var val = parseInt(this.dataset.val, 10);
            pmSlider.value = val;
            pmLic = val;
            pmCountEl.textContent = val >= 500 ? '500+' : val;
            if (val === 1) {
                pmTierAt1 = 'developer';
                showTierToggle(true);
                updateTierHighlight();
            } else {
                pmTierAt1 = 'developer';
                showTierToggle(false);
            }
            var newPlan = planForN(val);
            var planChanged = newPlan !== pmPlan;
            if (planChanged) pmPlan = newPlan;
            renderPmPricing();
            if (planChanged) animatePlanChange(newPlan);
            updateZoneHighlight(newPlan);
        });
    });

    function updateZoneHighlight(planKey) {
        var zoneKey = (planKey === 'rookie') ? 'developer' : planKey;
        Object.keys(pmZoneEls).forEach(function (k) {
            pmZoneEls[k].classList.toggle('active', k === zoneKey);
        });
    }

    // Tier toggle (Novato / Soldado at n=1)
    Object.keys(pmTierBtnEls).forEach(function (key) {
        pmTierBtnEls[key].addEventListener('click', function () {
            pmTierAt1 = key;
            pmPlan = key;
            updateTierHighlight();
            renderPmPricing();
            animatePlanChange(key);
        });
    });

    // Slider
    pmSlider.addEventListener('input', function () {
        pmLic = parseInt(this.value, 10);
        pmCountEl.textContent = pmLic >= 500 ? '500+' : pmLic;
        if (pmLic !== 1) {
            pmTierAt1 = 'developer';
            showTierToggle(false);
        } else {
            showTierToggle(true);
            updateTierHighlight();
        }
        var newPlan = planForN(pmLic);
        updateZoneHighlight(newPlan);
        var planChanged = newPlan !== pmPlan;
        if (planChanged) pmPlan = newPlan;
        renderPmPricing();
        if (planChanged) {
            clearTimeout(pmTimer);
            pmTimer = setTimeout(function () { animatePlanChange(newPlan); }, 60);
        }
    });

    // Billing toggle
    function setPmMode(annual) {
        pmAnnual = annual;
        pmMonthlyBtn.classList.toggle('active', !annual);
        pmAnnualBtn.classList.toggle('active', annual);
        renderPmPricing();
    }
    pmMonthlyBtn.addEventListener('click', function () { setPmMode(false); });
    pmAnnualBtn.addEventListener('click',  function () { setPmMode(true); });

    // Self-hosted
    pmShCheck.addEventListener('change', function () { pmSh = this.checked; renderPmPricing(); });

    // Plan card animation (pmPlan already updated by slider handler)
    function animatePlanChange(newKey) {
        if (pmAnimating) { renderPmCard(); return; }
        pmAnimating = true;
        pmPlanCard.classList.add('pm-card--exit');
        setTimeout(function () {
            renderPmCard();
            pmPlanCard.classList.remove('pm-card--exit');
            pmPlanCard.classList.add('pm-card--enter');
            setTimeout(function () {
                pmPlanCard.classList.remove('pm-card--enter');
                pmAnimating = false;
            }, 220);
        }, 140);
    }

    function renderPmCard() {
        var data = PLANS[pmPlan];
        if (!data) return;
        pmPlanNameEl.textContent = t('pricing.' + data.nameKey);
        var html = '';
        data.benefits.forEach(function (k) { html += '<li>' + t('pricing.' + k) + '</li>'; });
        html += '<li class="pm-benefit-support">' + t('pricing.' + data.supportKey) + '</li>';
        pmBenefitsEl.innerHTML = html;
    }

    function renderPmPricing() {
        var n    = pmLic;
        var data = PLANS[pmPlan];

        // Self-hosted note
        pmShNote.textContent = pmAnnual ? t('pricing.calc_sh_annual') : t('pricing.calc_sh_monthly');

        if (n === 0 || pmPlan === 'rookie') {
            pmPplEl.textContent     = '';
            pmMonthlyEl.textContent = t('pricing.price_free');
            pmMonthlyRow.hidden     = false;
            pmAnnualRow.hidden      = true;
            pmSavingsEl.textContent = '';
            pmCtaBtn.hidden         = false;
            pmCtaBtn.textContent    = t('pricing.pm_cta_free');
            pmCtaBtn.dataset.planKey = 'rookie';
            pmShCheck.checked       = false;
            pmShCheck.disabled      = true;
            pmSh                    = false;
            pmShNote.textContent    = '';
            return;
        }

        pmCtaBtn.hidden    = false;
        pmShCheck.disabled = false;

        var pricePerLic  = ppl(n);
        var shCost       = pmSh ? (pmAnnual ? SH_ANNUAL / MONTHS_ANNUAL : SH_MONTHLY) : 0;
        var monthlyBase  = n * pricePerLic;
        var monthlyTotal = monthlyBase + shCost;
        var annualBase   = monthlyBase * MONTHS_ANNUAL;
        var annualSh     = pmSh ? SH_ANNUAL : 0;
        var annualTotal  = annualBase + annualSh;
        var saving       = monthlyTotal * 12 - annualTotal;

        pmPplEl.textContent = fmt(pricePerLic) + ' / ' + t('pricing.calc_per_lic');
        pmMonthlyEl.textContent = fmtInt(monthlyTotal);

        pmMonthlyRow.hidden = pmAnnual;
        pmAnnualRow.hidden  = !pmAnnual;
        if (pmAnnual) {
            pmAnnualEl.textContent = fmtInt(annualTotal);
            var savingPart = saving > 0 ? ' (' + t('pricing.calc_saving_of') + ' ' + fmtInt(saving) + ')' : '';
            pmSavingsEl.textContent = t('pricing.calc_free_months') + savingPart;
        } else {
            pmSavingsEl.textContent = '';
        }

        pmCtaBtn.textContent     = t('pricing.pm_cta') + ' ' + t('pricing.' + (data ? data.nameKey : 'plan_biz'));
        pmCtaBtn.dataset.planKey = pmPlan;
    }

    // CTA: Free → /register/, others → contact modal
    pmCtaBtn.addEventListener('click', function () {
        if (this.dataset.planKey === 'free' || this.dataset.planKey === 'rookie') {
            window.location.href = '/register/';
            return;
        }
        var data = PLANS[pmPlan];
        closePlanModal();
        openContactModal(
            data ? data.ctaType : 'plan_biz',
            t('pricing.contact_title_' + (data ? data.ctaType : 'plan_biz'))
        );
    });

    // ── Info (i) tooltip toggle (mobile) ──────────────────────────────
    var pmInfoBtn = document.getElementById('pm-sh-info-btn');
    if (pmInfoBtn) {
        pmInfoBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            this.classList.toggle('open');
        });
        document.addEventListener('click', function () {
            pmInfoBtn.classList.remove('open');
        });
    }

    // ── Contact modal ──────────────────────────────────────────────────
    var contactModal = document.getElementById('contact-modal');
    var modalClose   = document.getElementById('modal-close');
    var modalTitle   = document.getElementById('modal-title');
    var modalType    = document.getElementById('modal-type');
    var modalStatus  = document.getElementById('modal-status');
    var modalSubmit  = document.getElementById('modal-submit');
    var contactForm  = document.getElementById('contact-form');

    function openContactModal(type, title) {
        modalType.value         = type;
        modalTitle.textContent  = title;
        modalStatus.hidden      = true;
        modalStatus.textContent = '';
        contactForm.reset();
        contactModal.hidden = false;
        document.body.style.overflow = 'hidden';
        var first = contactForm.querySelector('input');
        if (first) first.focus();
    }

    function closeContactModal() {
        contactModal.hidden = true;
        document.body.style.overflow = '';
    }

    modalClose.addEventListener('click', closeContactModal);
    contactModal.addEventListener('click', function (e) { if (e.target === contactModal) closeContactModal(); });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !contactModal.hidden) closeContactModal();
    });

    var consultingCta = document.getElementById('consulting-cta');
    if (consultingCta) {
        consultingCta.addEventListener('click', function () {
            openContactModal('solicitud_formacion', t('pricing.contact_title_training'));
        });
    }

    contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var name    = document.getElementById('modal-name').value.trim();
        var email   = document.getElementById('modal-email').value.trim();
        var message = document.getElementById('modal-message').value.trim();
        if (!name || !email) return;

        modalSubmit.disabled = true;
        modalStatus.hidden   = true;

        api.post('/api/admin/contact-requests', { type: modalType.value, label: 'solicitud_formacion', name: name, email: email, message: message })
        .then(function () {
            modalStatus.textContent = t('pricing.contact_success');
            modalStatus.className   = 'pr-modal-status pr-modal-status--ok';
            modalStatus.hidden      = false;
            contactForm.reset();
            setTimeout(closeContactModal, 2500);
        })
        .catch(function () {
            modalStatus.textContent = t('pricing.contact_error');
            modalStatus.className   = 'pr-modal-status pr-modal-status--err';
            modalStatus.hidden      = false;
        })
        .finally(function () { modalSubmit.disabled = false; });
    });

    // ── Init ───────────────────────────────────────────────────────────
    function init() {
        applyByok();
        renderPmCard();
        renderPmPricing();
    }

    if (window.i18n) {
        window.i18n.ready(init);
        window.i18n.onLangChange(function () { applyByok(); renderPmCard(); renderPmPricing(); });
    } else {
        init();
    }

})();
