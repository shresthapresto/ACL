/* ======================================================================
   StepSight AI - Frontend Logic (script.js)
   ----------------------------------------------------------------------
   - Doctor/Patient login & portal switching
   - Clinical Assessment (risk score) + redirect to assessment-result.html
   - Clinical & Patient report download (from any page)
   - MRI Upload & Analyze (FastAPI backend)
   - Motion Tracking (MediaPipe Pose)
====================================================================== */

/* ==============================
   GLOBAL APP STATE & CONSTANTS
============================== */

const AppState = {
    currentUser: null,
    currentUserType: null, // 'doctor' | 'patient'
    currentAssessment: null,
    currentTestimonial: 0,
    sportsRiskChart: null,

    // MRI tab
    selectedFile: null,
    analysisResult: null,

    isInitialized: false
};

const MEDICAL_DISCLAIMER =
    "This assessment is intended for informational and educational purposes only " +
    "and is not a substitute for professional medical advice, diagnosis, or treatment. " +
    "Always consult a qualified healthcare provider for medical concerns.";

const RISK_FACTORS = {
    AGE_PEAK_RISK: { min: 15, max: 25, weight: 15 },
    AGE_MODERATE:  { min: 26, max: 35, weight: 8 },
    AGE_LOW:       { threshold: 35, weight: -5 },
    AGE_YOUNG:     { threshold: 15, weight: 5 },
    BMI_UNDERWEIGHT: { threshold: 18.5, weight: 5 },
    BMI_OBESE:       { threshold: 30, weight: 10 },
    TRAINING_WEIGHT: 2.5,
    TRAINING_MAX: 25,
    FATIGUE_WEIGHT: 2,
    FLEXIBILITY_WEIGHT: 1.5,
    PAST_INJURY_WEIGHT: 20,
    BASE_SCORE: 20,
    GENDER_FEMALE_WEIGHT: 8
};

const RISK_THRESHOLDS = { LOW: 30, MODERATE: 60, HIGH: 100 };

const SPORT_RISK_MULTIPLIERS = {
    basketball: 1.15,
    soccer: 1.12,
    football: 1.10,
    skiing: 1.13,
    volleyball: 1.08,
    tennis: 1.05,
    gymnastics: 1.10,
    running: 0.95,
    swimming: 0.90,
    cycling: 0.92,
    default: 1.0
};

const API_BASE_URL = "http://127.0.0.1:5001/api/v1/mri";
let backendAvailable = true;


/* ==============================
   BASIC UTILITIES
============================== */

function scrollToPortal() {
    const el = document.getElementById('portalSection');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function scrollToFeatures() {
    const el = document.getElementById('featuresSection');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function showError(msg) {
    const el = document.getElementById('errorMessage');
    if (el) {
        el.textContent = `❌ ${msg}`;
        el.style.display = 'block';
    } else {
        alert(msg);
    }
}

function clearError() {
    const el = document.getElementById('errorMessage');
    if (el) {
        el.textContent = '';
        el.style.display = 'none';
    }
}


/* ==============================
   DOM READY
============================== */

document.addEventListener('DOMContentLoaded', () => {
    if (AppState.isInitialized) return;

    showDisclaimerOnPage();
    initSportsRiskChart();
    initTestimonialsAutoPlay();
    setupClinicalFormListeners();
    setupMRIEventListeners();

    AppState.isInitialized = true;
});

// Expose some helpers globally
window.scrollToPortal   = scrollToPortal;
window.scrollToFeatures = scrollToFeatures;


/* ==============================
   LANDING PAGE: DISCLAIMER
============================== */

function showDisclaimerOnPage() {
    const portalSection = document.getElementById('portalSection');
    if (!portalSection) return;

    const disclaimerHTML = `
        <div style="background: #fef2f2; border: 2px solid #ef4444; padding: 20px; 
                    border-radius: 12px; margin-bottom: 30px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.1);">
            <h3 style="color: #dc2626; margin-bottom: 10px; font-size: 1.2rem;">⚠️ Medical Disclaimer</h3>
            <p style="color: #666; line-height: 1.6; font-size: 0.95rem; margin: 0;">${MEDICAL_DISCLAIMER}</p>
        </div>
    `;
    portalSection.insertAdjacentHTML('beforebegin', disclaimerHTML);
}


/* ==============================
   SPORTS RISK CHART (Chart.js)
============================== */

function initSportsRiskChart() {
    const ctx = document.getElementById('sportsRiskChart');
    if (!ctx || typeof Chart === 'undefined') return;

    const chartCtx = ctx.getContext('2d');

    AppState.sportsRiskChart = new Chart(chartCtx, {
        type: 'bar',
        data: {
            labels: ['Basketball', 'Soccer', 'Skiing', 'Football', 'Gymnastics', 'Tennis', 'Volleyball', 'Running'],
            datasets: [{
                label: 'ACL Injury Risk Index',
                data: [72, 68, 65, 58, 61, 45, 52, 28],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(34, 197, 94, 0.8)'
                ],
                borderColor: [
                    'rgb(239, 68, 68)', 'rgb(239, 68, 68)', 'rgb(239, 68, 68)',
                    'rgb(245, 158, 11)', 'rgb(245, 158, 11)', 'rgb(245, 158, 11)',
                    'rgb(245, 158, 11)', 'rgb(34, 197, 94)'
                ],
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: { font: { size: 14, weight: 'bold' }, color: '#333', padding: 15 }
                },
                tooltip: {
                    callbacks: { label: (ctx) => 'Risk Index: ' + ctx.parsed.y + '/100' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { font: { size: 12 }, color: '#666' },
                    grid: { color: 'rgba(0, 0, 0, 0.05)' }
                },
                x: {
                    ticks: { font: { size: 12, weight: '600' }, color: '#333' },
                    grid: { display: false }
                }
            }
        }
    });
}


/* ==============================
   TESTIMONIALS CAROUSEL
============================== */

function initTestimonialsAutoPlay() {
    setInterval(nextTestimonial, 6000);
}

function getTestimonials() {
    return document.querySelectorAll('.testimonial-card');
}

function getIndicators() {
    return document.querySelectorAll('.indicator');
}

function showTestimonial(index) {
    const testimonials = getTestimonials();
    const indicators = getIndicators();
    const total = testimonials.length;
    if (index < 0 || index >= total) return;

    testimonials.forEach((card) => card.classList.remove('active'));
    indicators.forEach((i) => i.classList.remove('active'));

    if (testimonials[index]) testimonials[index].classList.add('active');
    if (indicators[index]) indicators[index].classList.add('active');

    AppState.currentTestimonial = index;
}

function nextTestimonial() {
    const testimonials = getTestimonials();
    const total = testimonials.length || 1;
    const nextIndex = (AppState.currentTestimonial + 1) % total;
    showTestimonial(nextIndex);
}

function prevTestimonial() {
    const testimonials = getTestimonials();
    const total = testimonials.length || 1;
    const prevIndex = (AppState.currentTestimonial - 1 + total) % total;
    showTestimonial(prevIndex);
}

function goToTestimonial(index) {
    showTestimonial(index);
}

window.prevTestimonial = prevTestimonial;
window.nextTestimonial = nextTestimonial;
window.goToTestimonial  = goToTestimonial;


/* ==============================
   AUTH / LOGIN
============================== */

function openAuthModal(userType) {
    AppState.currentUserType = userType;
    const modal = document.getElementById('authModal');
    const title = document.getElementById('authTitle');
    const subtitle = document.getElementById('authSubtitle');
    if (!modal || !title || !subtitle) return;

    if (userType === 'doctor') {
        title.textContent = 'Doctor Login';
        subtitle.textContent = 'Enter your credentials to access patient assessments';
    } else {
        title.textContent = 'Patient Login';
        subtitle.textContent = 'Enter your credentials to get your risk assessment';
    }

    modal.classList.add('active');
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    const form = document.getElementById('authForm');
    if (modal) modal.classList.remove('active');
    if (form) form.reset();
}

function handleLogin(event) {
    event.preventDefault();
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    if (!emailInput || !passwordInput) return;

    const email = (emailInput.value || '').trim();
    const password = passwordInput.value || '';

    if (!email || !password) {
        alert('Please enter both email and password.');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address.');
        return;
    }

    AppState.currentUser = {
        email,
        type: AppState.currentUserType,
        name: email.split('@')[0]
    };

    if (AppState.currentUserType === 'doctor') {
        loadDoctorPortal();
    } else {
        loadPatientPortal();
    }
    closeAuthModal();
}

function loadDoctorPortal() {
    const landingPage = document.getElementById('landingPage');
    const doctorPortal = document.getElementById('doctorPortalApp');
    const doctorNameSpan = document.getElementById('doctorName');

    if (landingPage) landingPage.style.display = 'none';
    if (doctorPortal) doctorPortal.classList.add('active');
    if (doctorNameSpan) doctorNameSpan.textContent = AppState.currentUser.name;

    setupClinicalFormListeners();
}

function loadPatientPortal() {
    const landingPage = document.getElementById('landingPage');
    const doctorPortal = document.getElementById('doctorPortalApp');
    const doctorNameSpan = document.getElementById('doctorName');
    const patientInfoBox = document.querySelector('.patient-info-box');
    const dashboardTitle = document.querySelector('.dashboard-title');
    const portalNav = document.querySelector('.portal-nav');
    const userBadge = document.querySelector('.user-badge');

    if (landingPage) landingPage.style.display = 'none';
    if (doctorPortal) doctorPortal.classList.add('active');
    if (doctorNameSpan) doctorNameSpan.textContent = AppState.currentUser.name;
    if (patientInfoBox) patientInfoBox.style.display = 'none';
    if (dashboardTitle) dashboardTitle.textContent = 'Patient Assessment';
    if (portalNav) portalNav.style.display = 'none';

    if (userBadge) {
        userBadge.classList.remove('doctor');
        userBadge.classList.add('patient');
        userBadge.style.background = 'rgba(245, 87, 108, 0.1)';
        userBadge.style.color = '#f5576c';
        userBadge.innerHTML = 'Patient: <span id="doctorName">' + AppState.currentUser.name + '</span>';
    }

    const assessmentTab = document.getElementById('assessment-tab');
    if (assessmentTab) {
        assessmentTab.classList.add('active');
        assessmentTab.style.display = 'block';
    }

    setupClinicalFormListeners();
}

function logout() {
    AppState.currentUser = null;
    AppState.currentUserType = null;
    AppState.currentAssessment = null;

    const doctorPortal = document.getElementById('doctorPortalApp');
    const landingPage = document.getElementById('landingPage');
    const authForm = document.getElementById('authForm');
    const resultsSection = document.getElementById('resultsSection');
    const patientInfoBox = document.querySelector('.patient-info-box');
    const dashboardTitle = document.querySelector('.dashboard-title');

    if (doctorPortal) doctorPortal.classList.remove('active');
    if (landingPage) landingPage.style.display = 'block';
    if (authForm) authForm.reset();
    if (resultsSection) resultsSection.classList.remove('active');
    if (patientInfoBox) patientInfoBox.style.display = 'block';
    if (dashboardTitle) dashboardTitle.textContent = 'Doctor Dashboard';
}

window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.handleLogin = handleLogin;
window.logout = logout;


/* ==============================
   DOCTOR PORTAL: TAB NAVIGATION
============================== */

function showDoctorTab(tabName) {
    document.querySelectorAll('.doctor-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));

    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) selectedTab.classList.add('active');

    document.querySelectorAll('.nav-tab').forEach(btn => {
        const onClickStr = btn.getAttribute('onclick') || '';
        if (onClickStr.includes(`'${tabName}'`)) btn.classList.add('active');
    });

    if (tabName === 'mri') {
        const empty = document.getElementById('emptyState');
        const loading = document.getElementById('loadingState');
        const content = document.getElementById('analysisContent');
        if (empty)   empty.style.display = 'block';
        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'none';
        clearError();
    }
}

window.showDoctorTab = showDoctorTab;


/* ==============================
   CLINICAL ASSESSMENT
============================== */

function setupClinicalFormListeners() {
    const form = document.getElementById('doctorAssessmentForm');
    const fatigueSlider = document.getElementById('fatigue');
    const flexibilitySlider = document.getElementById('flexibility');

    if (form) {
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        newForm.addEventListener('submit', analyzeDoctorAssessment);
    }

    if (fatigueSlider) {
        fatigueSlider.addEventListener('input', (e) => {
            const valueSpan = document.getElementById('fatigueValue');
            if (valueSpan) valueSpan.textContent = e.target.value;
        });
    }

    if (flexibilitySlider) {
        flexibilitySlider.addEventListener('input', (e) => {
            const valueSpan = document.getElementById('flexibilityValue');
            if (valueSpan) valueSpan.textContent = e.target.value;
        });
    }
}

function validateBMI(bmi) {
    if (isNaN(bmi) || bmi < 10 || bmi > 60) {
        throw new Error('BMI value appears invalid. Please enter a value between 10 and 60.');
    }
    return true;
}

function validateAge(age) {
    if (isNaN(age) || age < 10 || age > 100) {
        throw new Error('Age must be between 10 and 100.');
    }
    return true;
}

function validateTraining(hours) {
    if (isNaN(hours) || hours < 0 || hours > 50) {
        throw new Error('Training hours must be between 0 and 50 per week.');
    }
    return true;
}

function analyzeDoctorAssessment(event) {
    event.preventDefault();

    try {
        // Basic values
        const age = parseInt(document.getElementById('age').value);
        validateAge(age);

        const bmi = parseFloat(document.getElementById('bmi').value);
        validateBMI(bmi);

        const training = parseFloat(document.getElementById('training').value);
        validateTraining(training);

        const gender = document.getElementById('gender').value;
        const sport = document.getElementById('sport').value.trim();
        const fatigue = parseInt(document.getElementById('fatigue').value);
        const flexibility = parseInt(document.getElementById('flexibility').value);
        const pastInjury = document.getElementById('pastInjury').value === 'yes';

        // Patient info (for doctors)
        let patientInfo = {};
        if (AppState.currentUserType === 'doctor') {
            patientInfo = {
                patientName: document.getElementById('patientName')?.value || 'N/A',
                patientID: document.getElementById('patientID')?.value || 'N/A',
                dateOfBirth: document.getElementById('dateOfBirth')?.value || 'N/A',
                contactNumber: document.getElementById('contactNumber')?.value || 'N/A',
            };
        }

        const doctorNotes = document.getElementById('doctorNotes')?.value || '';

        // Motion & functional metrics
        const motionMetrics = {
            kneeValgus: parseFloat(document.getElementById("kneeValgus")?.value),
            dynamicStability: parseFloat(document.getElementById("dynamicStability")?.value),
            balanceTime: parseFloat(document.getElementById("balanceTime")?.value),
            strengthRatio: parseFloat(document.getElementById("strengthRatio")?.value),
            landingQuality: parseFloat(document.getElementById("landingQuality")?.value)
        };

        // Risk score
        const riskScore = calculateRiskScore(
            age, gender, bmi, sport, training,
            fatigue, flexibility, pastInjury,
            motionMetrics
        );

        // Level, description, training plan & youtube link
        let level, description;
        if (riskScore < 30) {
            level = "Low Risk";
            description = "Minimal ACL injury risk based on current metrics. Maintain good training habits and monitoring.";
        } else if (riskScore < 60) {
            level = "Moderate Risk";
            description = "Moderate ACL vulnerability. Address strength, landing mechanics and control to reduce risk.";
        } else {
            level = "High Risk";
            description = "High ACL injury risk. Strongly consider targeted prevention, rehab and specialist review.";
        }

        const plan = getTrainingPlan(riskScore);
        const youtube = getYoutubeVideo(riskScore);

        // Store current assessment in memory
        AppState.currentAssessment = {
            ...patientInfo,
            age,
            gender,
            bmi,
            sport,
            training,
            fatigue,
            flexibility,
            pastInjury,

            kneeValgus: motionMetrics.kneeValgus ?? null,
            dynamicStability: motionMetrics.dynamicStability ?? null,
            balanceTime: motionMetrics.balanceTime ?? null,
            strengthRatio: motionMetrics.strengthRatio ?? null,
            landingQuality: motionMetrics.landingQuality ?? null,

            doctorNotes,
            assessmentDate: new Date().toLocaleDateString(),
            assessmentTime: new Date().toLocaleTimeString(),
            riskScore,
            riskLevel: level
        };

        // Save for assessment-result.html
        const storedResult = {
            ...AppState.currentAssessment,
            score: riskScore,
            level,
            description,
            trainingPlan: plan,
            youtube
        };

        AppState.currentAssessment = {
    score: riskScore,
    level,
    description,
    trainingPlan: plan,
    youtube,
    patientInfo,
    assessmentDate: new Date().toLocaleString(),
    motionMetrics,
    riskScore: riskScore,
    riskLevel: level
};

        localStorage.setItem("assessmentResult", JSON.stringify(storedResult));

        // Redirect to modern result page
        window.location.href = "assessment-result.html";

    } catch (err) {
        alert("Error: " + err.message);
    }
}


/* ===================================
   RISK SCORE FUNCTION
=================================== */

function calculateRiskScore(
    age, gender, bmi, sport, training, fatigue, flexibility, pastInjury,
    motion = {}
) {
    let score = RISK_FACTORS.BASE_SCORE;
    const { kneeValgus, dynamicStability, balanceTime, strengthRatio, landingQuality } = motion;

    // Age
    if (age >= RISK_FACTORS.AGE_PEAK_RISK.min && age <= RISK_FACTORS.AGE_PEAK_RISK.max) {
        score += RISK_FACTORS.AGE_PEAK_RISK.weight;
    } else if (age > RISK_FACTORS.AGE_MODERATE.min && age <= RISK_FACTORS.AGE_MODERATE.max) {
        score += RISK_FACTORS.AGE_MODERATE.weight;
    } else if (age > RISK_FACTORS.AGE_LOW.threshold) {
        score += RISK_FACTORS.AGE_LOW.weight;
    } else {
        score += RISK_FACTORS.AGE_YOUNG.weight;
    }

    // Gender
    if (gender === 'female') score += RISK_FACTORS.GENDER_FEMALE_WEIGHT;

    // BMI
    if (bmi < RISK_FACTORS.BMI_UNDERWEIGHT.threshold) score += RISK_FACTORS.BMI_UNDERWEIGHT.weight;
    else if (bmi > RISK_FACTORS.BMI_OBESE.threshold) score += RISK_FACTORS.BMI_OBESE.weight;

    // Training
    const trainingScore = Math.min(training * RISK_FACTORS.TRAINING_WEIGHT, RISK_FACTORS.TRAINING_MAX);
    score += trainingScore;

    // Fatigue
    score += fatigue * RISK_FACTORS.FATIGUE_WEIGHT;

    // Flexibility (lower flexibility => higher risk, baseline at 5)
    score -= (flexibility - 5) * RISK_FACTORS.FLEXIBILITY_WEIGHT;

    // Past Injury
    if (pastInjury) score += RISK_FACTORS.PAST_INJURY_WEIGHT;

    // 🔥 Motion & Strength Metrics

    // Knee Valgus
    if (typeof kneeValgus === 'number' && !isNaN(kneeValgus)) {
        if (kneeValgus > 12)      score += 10;
        else if (kneeValgus > 8)  score += 6;
        else if (kneeValgus > 4)  score += 3;
        else                      score -= 2;
    }

    // Dynamic Stability
    if (typeof dynamicStability === 'number' && !isNaN(dynamicStability)) {
        if (dynamicStability >= 85)      score -= 8;
        else if (dynamicStability >= 70) score -= 4;
        else if (dynamicStability < 50)  score += 6;
    }

    // Single-Leg Balance Time
    if (typeof balanceTime === 'number' && !isNaN(balanceTime)) {
        if (balanceTime < 10)       score += 6;
        else if (balanceTime < 20)  score += 3;
        else if (balanceTime >= 30) score -= 4;
    }

    // Strength Ratio (hamstring:quad)
    if (typeof strengthRatio === 'number' && !isNaN(strengthRatio)) {
        if (strengthRatio < 0.5)       score += 8;
        else if (strengthRatio < 0.6)  score += 4;
        else if (strengthRatio >= 0.8) score += 4;
        else                           score -= 2;
    }

    // Landing Mechanics (0–10, lower = worse)
    if (typeof landingQuality === 'number' && !isNaN(landingQuality)) {
        score += (5 - landingQuality) * 1.2;
    }

    // Sport multiplier
    const sportLower = (sport || '').toLowerCase();
    let multiplier = SPORT_RISK_MULTIPLIERS.default;
    for (const [sportKey, mult] of Object.entries(SPORT_RISK_MULTIPLIERS)) {
        if (sportLower.includes(sportKey)) {
            multiplier = mult;
            break;
        }
    }

    score *= multiplier;
    return Math.max(0, Math.min(100, Math.round(score)));
}


/* ==============================
   TRAINING PLAN & YOUTUBE
============================== */

function getTrainingPlan(score) {
    if (score < 30) {
        return `
        <strong>Goal:</strong> Maintain strong biomechanics and prevent future ACL stress.<br><br>

        <strong>🟢 Weekly Schedule (3 Days/Week)</strong><br>
        <ul>
            <li><strong>Warm-Up (10 min)</strong>: Light jog → dynamic lunges → hip openers</li>
            <li><strong>Strength (20 min)</strong>: 
                <ul>
                    <li>Back squats – 3×10</li>
                    <li>Deadlifts – 3×8</li>
                    <li>Nordic hamstring curl – 3×6</li>
                    <li>Glute bridges – 3×15</li>
                </ul>
            </li>
            <li><strong>Plyometrics (10 min)</strong>:
                <ul>
                    <li>Box jumps – 3×6</li>
                    <li>Lateral hops – 3×12 each side</li>
                </ul>
            </li>
            <li><strong>Balance (5 min)</strong>: Single-leg stands eyes-closed – 3×30 seconds</li>
        </ul><br>

        <strong>📝 Form Cues</strong>
        <ul>
            <li>Knees track over toes</li>
            <li>Engage core on all landings</li>
            <li>Keep hip alignment neutral</li>
        </ul>

        <strong>🚫 Avoid:</strong> Excessive fatigue and high-impact surfaces during intense weeks.<br><br>
        <strong>📅 Re-assessment:</strong> Every 6–12 months.
        `;
    }

    if (score < 60) {
        return `
        <strong>Goal:</strong> Correct knee valgus, improve stability & build hamstring dominance.<br><br>

        <strong>🟡 Weekly Schedule (4 Days/Week)</strong><br>

        <strong>1️⃣ Mobility & Activation (Daily, 10–15 min)</strong>
        <ul>
            <li>Hip flexor stretch – 45 sec</li>
            <li>Ankle mobility drills – 2 min</li>
            <li>Glute activation band walks – 3×20 steps</li>
        </ul><br>

        <strong>2️⃣ Strength Training (3 Days/Week)</strong>
        <ul>
            <li>Romanian deadlifts – 3×8</li>
            <li>Single-leg step-downs – 3×10 each side</li>
            <li>Split squats – 3×10</li>
            <li>Hamstring curls – 3×12</li>
            <li>Hip thrusts – 3×12</li>
        </ul><br>

        <strong>3️⃣ Neuromuscular Control (3 Days/Week)</strong>
        <ul>
            <li>Single-leg balance with reach – 3×8</li>
            <li>Agility ladder – 2 rounds</li>
            <li>Drop-jump mechanics – 2×6 (soft landing focus)</li>
        </ul><br>

        <strong>4️⃣ Light Plyometrics (1–2 Days/Week)</strong>
        <ul>
            <li>Lateral bounding – 3×10</li>
            <li>Forward hops – 3×10</li>
        </ul><br>

        <strong>⚠ Form Corrections</strong>
        <ul>
            <li>Avoid inward knee collapse</li>
            <li>Land quietly → absorb with hips first</li>
            <li>Maintain neutral pelvis</li>
        </ul>

        <strong>🚫 Avoid:</strong> Deep knee pivots, tired jump training, and cutting at high speeds.<br><br>
        <strong>📅 Re-assessment:</strong> 3–6 months.
        `;
    }

    return `
        <strong>Goal:</strong> Reduce ACL load, restore stability, and prepare for rehab progression.<br><br>

        <strong>🔴 High-Risk Training Plan (5 Days/Week)</strong><br>

        <strong>🧊 Phase 1 – Pain, Swelling & Stability (Weeks 1–2)</strong>
        <ul>
            <li>Isometric quad sets – 3×15 sec</li>
            <li>Heel slides – 3×10</li>
            <li>Straight leg raises – 3×12</li>
            <li>Standing balance – 3×30 sec</li>
            <li>Glute bridges – 3×12</li>
        </ul><br>

        <strong>🔥 Phase 2 – Strength & Control (Weeks 2–6)</strong>
        <ul>
            <li>Step-ups – 3×12</li>
            <li>Wall sits – 3×20 sec</li>
            <li>Side-lying hip abductions – 3×12</li>
            <li>Resistance band lateral steps – 3×20</li>
            <li>Mini-squat mechanics training – 3×8</li>
        </ul><br>

        <strong>⚡ Phase 3 – Pre-Sport Prep (Weeks 6–10)</strong>
        <ul>
            <li>Single-leg Romanian deadlifts – 3×8</li>
            <li>Split squats – 3×10</li>
            <li>Controlled landing drills – 3×6</li>
            <li>Walk → jog progression – 10 min</li>
        </ul><br>

        <strong>🔥 High-Risk Form Corrections</strong>
        <ul>
            <li>Knee must stay aligned with 2nd toe ALWAYS</li>
            <li>Land softly and bend hips more than knees</li>
            <li>Avoid twisting while knee is bent</li>
            <li>Stop immediately if swelling increases</li>
        </ul>

        <strong>🚫 Absolutely Avoid:</strong>
        <ul>
            <li>Jumping</li>
            <li>Cutting / pivoting</li>
            <li>Sprinting</li>
            <li>Deep lunges under fatigue</li>
        </ul>

        <strong>📅 Re-assessment:</strong> 6–8 weeks<br>
        <strong>❗ PT Referral Recommended</strong>
    `;
}

function getYoutubeVideo(score) {
    // Low / Moderate / High risk videos
    if (score < 30) {
        return "https://www.youtube.com/embed/F6yi7WrIcRY";
    }
    if (score < 60) {
        return "https://www.youtube.com/embed/HfSWFMGoCFc";
    }
    return "https://www.youtube.com/embed/Czx6LUnG1cs";
}


/* ==============================
   INLINE RESULTS (OLD UI SUPPORT)
   (Still used for report generation)
============================== */

function displayResults(score) {
    const riskCircle = document.getElementById('riskCircle');
    const riskLabel = document.getElementById('riskLabel');
    const riskDescription = document.getElementById('riskDescription');
    const recommendationsDiv = document.getElementById('recommendations');
    const riskScoreSpan = document.getElementById('riskScore');
    if (!riskCircle || !riskLabel || !riskDescription || !recommendationsDiv || !riskScoreSpan) return;

    riskScoreSpan.textContent = score;
    riskCircle.className = 'risk-circle';

    let label, description, riskClass, recommendations;

    if (score < RISK_THRESHOLDS.LOW) {
        riskClass = 'low';
        label = 'Low Risk';
        description = 'Relatively low ACL injury risk based on the provided factors.';
        recommendations = getTrainingPlan(score);
    } else if (score < RISK_THRESHOLDS.MODERATE) {
        riskClass = 'medium';
        label = 'Moderate Risk';
        description = 'Moderate ACL injury risk. Consider enhanced preventive measures.';
        recommendations = getTrainingPlan(score);
    } else {
        riskClass = 'high';
        label = 'Higher Risk';
        description = 'Elevated ACL injury risk. Comprehensive prevention program recommended.';
        recommendations = getTrainingPlan(score);
    }

    riskCircle.classList.add(riskClass);
    riskLabel.textContent = label;
    riskDescription.textContent = description;
    recommendationsDiv.innerHTML = recommendations;

    if (!AppState.currentAssessment) AppState.currentAssessment = {};
    AppState.currentAssessment.riskScore = score;
    AppState.currentAssessment.riskLevel = label;
}


/* ==============================
   REPORT DOWNLOAD (TXT)
============================== */

function ensureAssessmentFromStorage() {
    if (AppState.currentAssessment) return;

    const stored = localStorage.getItem("assessmentResult");
    if (!stored) return;

    try {
        const r = JSON.parse(stored);
        AppState.currentAssessment = {
            patientName: r.patientName || 'N/A',
            patientID: r.patientID || 'N/A',
            dateOfBirth: r.dateOfBirth || 'N/A',
            contactNumber: r.contactNumber || 'N/A',

            age: r.age,
            gender: r.gender,
            bmi: r.bmi,
            sport: r.sport,
            training: r.training,
            fatigue: r.fatigue,
            flexibility: r.flexibility,
            pastInjury: r.pastInjury,

            kneeValgus: r.kneeValgus,
            dynamicStability: r.dynamicStability,
            balanceTime: r.balanceTime,
            strengthRatio: r.strengthRatio,
            landingQuality: r.landingQuality,

            doctorNotes: r.doctorNotes || '',
            assessmentDate: r.assessmentDate,
            assessmentTime: r.assessmentTime,
            riskScore: r.score || r.riskScore,
            riskLevel: r.level || r.riskLevel
        };
    } catch (e) {
        console.warn("Failed to parse assessmentResult from localStorage", e);
    }
}

async function downloadReport(type) {
    if (!AppState.currentAssessment) {
        alert('No assessment data available. Please complete an assessment first.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const a = AppState.currentAssessment;
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("StepSight AI – ACL Risk Assessment Report", 10, 15);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Report Type: ${type === "doctor" ? "Clinical Report" : "Patient Report"}`, 10, 28);
    doc.text(`Generated: ${date} @ ${time}`, 10, 35);

    doc.setLineWidth(0.5);
    doc.line(10, 40, 200, 40);

    // PATIENT INFORMATION
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Patient Information", 10, 50);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    let y = 58;

    const patientInfo = [
        `Name: ${a.patientName || 'N/A'}`,
        `Patient ID: ${a.patientID || 'N/A'}`,
        `Date of Birth: ${a.dateOfBirth || 'N/A'}`,
        `Contact: ${a.contactNumber || 'N/A'}`
    ];

    patientInfo.forEach((line) => {
        doc.text(line, 10, y);
        y += 7;
    });

    // RISK DETAILS
    y += 5;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("ACL Risk Assessment", 10, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Risk Score: ${a.riskScore}/100`, 10, y);
    y += 6;
    doc.text(`Risk Level: ${a.riskLevel}`, 10, y);
    y += 10;

    // TRAINING PLAN
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Training Recommendations", 10, y);
    y += 8;

    doc.setFontSize(10);
    const trainingLines = doc.splitTextToSize(a.trainingPlan.replace(/<br>/g, "\n").replace(/•/g, "-"), 180);
    doc.text(trainingLines, 10, y);
    y += trainingLines.length * 5 + 5;

    // DISCLAIMER
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text(MEDICAL_DISCLAIMER, 10, y);

    // Save file
    doc.save(`StepSight_${type === 'doctor' ? 'Clinical' : 'Patient'}_Report.pdf`);
}



/* ==============================
   MRI TAB (UPLOAD & ANALYZE)
============================== */

function setupMRIEventListeners() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const analyzeBtn = document.getElementById('analyzeBtn');

    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');

    const emptyState = document.getElementById('emptyState');
    const loadingState = document.getElementById('loadingState');
    const analysisContent = document.getElementById('analysisContent');

    if (!fileInput || !analyzeBtn) return;

    if (dropZone) {
        ['dragenter', 'dragover'].forEach(evt =>
            dropZone.addEventListener(evt, (e) => {
                e.preventDefault(); e.stopPropagation();
                dropZone.classList.add('drag-over');
            })
        );
        ['dragleave', 'drop'].forEach(evt =>
            dropZone.addEventListener(evt, (e) => {
                e.preventDefault(); e.stopPropagation();
                dropZone.classList.remove('drag-over');
            })
        );

        dropZone.addEventListener('click', () => fileInput.click());

        dropZone.addEventListener('drop', (e) => {
            const dtFiles = e.dataTransfer?.files;
            if (dtFiles && dtFiles.length > 0) {
                fileInput.files = dtFiles;
                handleFileSelection(dtFiles[0]);
            }
        });
    }

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files?.[0];
        if (file) handleFileSelection(file);
    });

    function handleFileSelection(file) {
        AppState.selectedFile = file;
        clearError();

        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        if (fileName) fileName.innerText = `📁 ${file.name}`;
        if (fileSize) fileSize.innerText = `(${(file.size / 1024 / 1024).toFixed(2)} MB)`;
        analyzeBtn.disabled = false;

        if (emptyState) emptyState.style.display = 'block';
        if (loadingState) loadingState.style.display = 'none';
        if (analysisContent) analysisContent.style.display = 'none';

        if (progressBar) progressBar.classList.remove('show');
        if (progressFill) progressFill.style.width = '0%';
    }

    analyzeBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!AppState.selectedFile) {
            showError('Please upload an MRI image first!');
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        if (loadingState) loadingState.style.display = 'block';
        if (analysisContent) analysisContent.style.display = 'none';
        if (progressBar) progressBar.classList.add('show');
        if (progressFill) progressFill.style.width = '15%';

        try {
            const uploadId = await uploadMRItoBackend(AppState.selectedFile, progressFill);
            const result = await analyzeMRIBackend(uploadId, progressFill);

            if (loadingState) loadingState.style.display = 'none';
            if (analysisContent) analysisContent.style.display = 'block';
            if (progressFill) progressFill.style.width = '100%';
            setTimeout(() => { if (progressBar) progressBar.classList.remove('show'); }, 500);

            populateMRIResults(result);
        } catch (err) {
            if (loadingState) loadingState.style.display = 'none';
            setTimeout(() => { if (progressBar) progressBar.classList.remove('show'); }, 500);
            showError(err.message || 'Analysis failed');

            populateMRIResults(getDemoMRIResult());
            if (analysisContent) analysisContent.style.display = 'block';
        }
    });
}

async function uploadMRItoBackend(file, progressFillEl) {
    const formData = new FormData();
    formData.append("file", file);

    if (progressFillEl) progressFillEl.style.width = '35%';

    const resp = await fetch(`${API_BASE_URL}/upload`, { method: "POST", body: formData });
    let data = null;
    try { data = await resp.json(); } catch(e) {}

    if (!resp.ok) {
        const msg = data?.error || `Upload failed (status ${resp.status})`;
        throw new Error(msg);
    }
    if (progressFillEl) progressFillEl.style.width = '55%';
    const uploadId = data?.upload_id;
    if (!uploadId) throw new Error('Upload failed: missing upload_id');
    return uploadId;
}

async function analyzeMRIBackend(uploadId, progressFillEl) {
    if (progressFillEl) progressFillEl.style.width = '70%';
    const resp = await fetch(`${API_BASE_URL}/analyze/${uploadId}`);
    let data = null;
    try { data = await resp.json(); } catch(e) {}

    if (!resp.ok) {
        const msg = data?.error || `Analysis failed (status ${resp.status})`;
        throw new Error(msg);
    }
    if (progressFillEl) progressFillEl.style.width = '90%';
    return data;
}

function populateMRIResults(result) {
    AppState.analysisResult = {
        riskScore: result.risk_score,
        severityLevel: result.severity_level,
        findings: result.findings?.structural || [],
        tears: result.findings?.tears || [],
        surrounding: result.findings?.surrounding || [],
        severity: result.findings?.severity || [],
        treatment: result.findings?.recommendations || [],
        uploadId: result.upload_id,
        timestamp: result.analysis_timestamp
    };

    const acuityScore = document.getElementById('acuityScore');
    if (acuityScore) acuityScore.textContent = `${result.risk_score}%`;

    const severityAssessment = document.getElementById('severityAssessment');
    if (severityAssessment) {
        severityAssessment.innerHTML = `
            <div class="finding-item severity-${result.severity_level}">
                Overall Severity: ${String(result.severity_level || '').toUpperCase()}
            </div>
        `;
    }

    setFindingListHTML('structuralFindings', result.findings?.structural, "No structural findings available.");
    setFindingListHTML('tearAnalysis',        result.findings?.tears,      "No ligament tear details.");
    setFindingListHTML('surroundingTissues',  result.findings?.surrounding,"No tissue findings available.");

    const treatmentPlan = document.getElementById('treatmentPlan');
    if (treatmentPlan) {
        const recs = result.findings?.recommendations || ["No treatment recommendations"];
        treatmentPlan.textContent = recs.join('\n');
    }
}

function setFindingListHTML(elementId, findingsArray, emptyMsg) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const items = (findingsArray || []).map(f => {
        const sev = typeof f.severity === 'string' ? f.severity : 'info';
        const txt = typeof f.text === 'string' ? f.text : String(f);
        return `<div class="finding-item severity-${sev}">• ${txt}</div>`;
    });

    el.innerHTML = items.length > 0 ? items.join('') : emptyMsg;
}

function getDemoMRIResult() {
    return {
        risk_score: 62,
        severity_level: 'moderate',
        findings: {
            structural: [
                { severity: 'moderate', text: 'Mild thickening of ACL fibers with intermediate signal intensity.' },
                { severity: 'low', text: 'No frank discontinuity noted.' }
            ],
            tears: [
                { severity: 'low', text: 'No complete ACL tear; low suspicion for partial sprain.' }
            ],
            surrounding: [
                { severity: 'low', text: 'Menisci intact. No significant joint effusion.' }
            ],
            severity: [
                { severity: 'moderate', text: 'Overall moderate concern for ACL strain without full-thickness tear.' }
            ],
            recommendations: [
                'Relative rest and activity modification for 2–3 weeks.',
                'Supervised physiotherapy emphasizing hamstring/quadriceps balance.',
                'Neuromuscular training and progressive plyometrics as tolerated.',
                'Follow-up MRI if symptoms persist > 6–8 weeks or deteriorate.'
            ]
        },
        upload_id: 'DEMO-LOCAL',
        analysis_timestamp: new Date().toISOString()
    };
}


/* ==============================
   MRI REPORT DOWNLOAD
============================== */

async function downloadMRIReport(type) {
    if (!AppState.analysisResult) {
        alert('No analysis results available. Please analyze an MRI image first.');
        return;
    }

    if (type === 'email') {
        alert('📧 Email feature coming soon! (This would email the report to the patient/physician.)');
        return;
    }

    const r = AppState.analysisResult;
    const fileName = AppState.selectedFile ? AppState.selectedFile.name : 'Unknown';

    const reportContent = `
═══════════════════════════════════════════════════════
          STEPSIGHT AI - MRI ANALYSIS REPORT
═══════════════════════════════════════════════════════

⚠️ IMPORTANT: This is a DEMO report for educational purposes only.
NOT for clinical use.

REPORT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated: ${new Date().toLocaleString()}
Analyzed by: ${AppState.currentUser ? AppState.currentUser.name : 'System'}
File: ${fileName}

ANALYSIS RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Risk Score: ${r.riskScore}%
Severity Level: ${String(r.severityLevel || '').toUpperCase()}

STRUCTURAL FINDINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${(r.findings || []).map(f => '• ' + f.text).join('\n') || '—'}

LIGAMENT TEAR ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${(r.tears || []).map(t => '• ' + t.text).join('\n') || '—'}

SURROUNDING TISSUES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${(r.surrounding || []).map(s => '• ' + s.text).join('\n') || '—'}

SEVERITY ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${(r.severity || []).map(s => '• ' + s.text).join('\n') || '—'}

RECOMMENDED TREATMENT PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${(r.treatment || []).join('\n') || '—'}

═══════════════════════════════════════════════════════
${MEDICAL_DISCLAIMER}
═══════════════════════════════════════════════════════
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `StepSight_MRI_Analysis_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    alert('✅ MRI Analysis Report downloaded successfully!');
}
window.downloadMRIReport = downloadMRIReport;


/* ==============================
   🎥 MOTION TRACKING (MediaPipe)
============================== */

async function initMotionTracking() {
    const videoEl = document.getElementById('poseVideo');
    const kneeEl = document.getElementById('kneeAngle');
    const stabilityEl = document.getElementById('stability');
    const startBtn = document.getElementById('startMotionBtn');
    const canvasEl = document.getElementById('outputCanvas');
    if (!videoEl || !startBtn || !canvasEl) return;

    const ctx = canvasEl.getContext('2d');

    await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/pose");
    await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils");

    const pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
    });

    pose.onResults((results) => {
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        ctx.drawImage(results.image, 0, 0, canvasEl.width, canvasEl.height);

        if (results.poseLandmarks) {
            for (const [i, landmark] of results.poseLandmarks.entries()) {
                ctx.beginPath();
                ctx.arc(landmark.x * canvasEl.width, landmark.y * canvasEl.height, 3, 0, 2 * Math.PI);
                ctx.fillStyle = i === 26 ? "red" : "rgba(0,255,0,0.5)";
                ctx.fill();
            }
        }

        if (results.poseLandmarks) {
            const lm = results.poseLandmarks;

            const leftHip = lm[23];
            const leftKnee = lm[25];
            const leftAnkle = lm[27];
            const angle = getAngle(leftHip, leftKnee, leftAnkle);

            if (!window.angleBuffer) window.angleBuffer = [];
            window.angleBuffer.push(angle);
            if (window.angleBuffer.length > 15) window.angleBuffer.shift();
            const smoothAngle =
                window.angleBuffer.reduce((a, b) => a + b, 0) / window.angleBuffer.length;

            kneeEl.textContent = isNaN(smoothAngle) ? "--" : Math.round(smoothAngle);

            stabilityEl.textContent =
                smoothAngle > 140
                    ? "Standing"
                    : smoothAngle > 90
                    ? "Partial Bend"
                    : "Full Bend";

            if (!window.repState) window.repState = "up";
            if (!window.repCount) window.repCount = 0;

            if (smoothAngle < 90 && window.repState === "up") {
                window.repState = "down";
            }

            if (smoothAngle > 140 && window.repState === "down") {
                window.repState = "up";
                window.repCount++;

                const msg = new SpeechSynthesisUtterance(`Good rep number ${window.repCount}`);
                msg.pitch = 1.1;
                msg.rate = 1;
                msg.volume = 1;
                window.speechSynthesis.speak(msg);

                canvasEl.style.borderColor = "#22c55e";
                setTimeout(() => (canvasEl.style.borderColor = "#e5e7eb"), 300);
            }

            let repLabel = document.getElementById("repCount");
            if (!repLabel) {
                repLabel = document.createElement("p");
                repLabel.id = "repCount";
                repLabel.style.fontSize = "1.5rem";
                repLabel.style.fontWeight = "600";
                repLabel.style.color = "#22c55e";
                repLabel.style.marginTop = "6px";
                stabilityEl.parentNode.insertBefore(repLabel, stabilityEl.nextSibling);
            }
            repLabel.textContent = `Reps: ${window.repCount}`;

            if (!window.sessionStart) window.sessionStart = Date.now();
            const elapsedSec = Math.floor((Date.now() - window.sessionStart) / 1000);

            let timerLabel = document.getElementById("sessionTimer");
            if (!timerLabel) {
                timerLabel = document.createElement("p");
                timerLabel.id = "sessionTimer";
                timerLabel.style.fontSize = "1.2rem";
                timerLabel.style.color = "#3b82f6";
                timerLabel.style.marginTop = "4px";
                stabilityEl.parentNode.insertBefore(timerLabel, stabilityEl.nextSibling);
            }
            timerLabel.textContent = `⏱ Session: ${elapsedSec}s`;

            if (!window.angleVarianceBuffer) window.angleVarianceBuffer = [];
            window.angleVarianceBuffer.push(smoothAngle);
            if (window.angleVarianceBuffer.length > 50) window.angleVarianceBuffer.shift();

            const avgAngle =
                window.angleVarianceBuffer.reduce((a, b) => a + b, 0) /
                window.angleVarianceBuffer.length;
            const variance =
                window.angleVarianceBuffer.reduce((sum, val) => sum + (val - avgAngle) ** 2, 0) /
                window.angleVarianceBuffer.length;

            let stabilityScore = Math.max(0, 100 - variance * 2);
            stabilityScore = Math.round(stabilityScore);

            if (!window.stabilityScores) window.stabilityScores = [];
            window.stabilityScores.push(stabilityScore);

            let scoreLabel = document.getElementById("stabilityScore");
            if (!scoreLabel) {
                scoreLabel = document.createElement("p");
                scoreLabel.id = "stabilityScore";
                scoreLabel.style.fontSize = "1.2rem";
                scoreLabel.style.fontWeight = "600";
                scoreLabel.style.color = "#f59e0b";
                scoreLabel.style.marginTop = "4px";
                stabilityEl.parentNode.insertBefore(scoreLabel, stabilityEl.nextSibling);
            }
            scoreLabel.textContent = `🧠 Stability Score: ${stabilityScore}`;

            const bar = document.getElementById("stabilityBar");
            if (bar) {
                bar.style.width = `${stabilityScore}%`;
                if (stabilityScore > 85) {
                    bar.style.backgroundColor = "#22c55e";
                } else if (stabilityScore > 70) {
                    bar.style.backgroundColor = "#facc15";
                } else {
                    bar.style.backgroundColor = "#ef4444";
                }
                bar.style.boxShadow = `0 0 12px ${bar.style.backgroundColor}`;
            }

            if (!window.lastLiveSend || Date.now() - window.lastLiveSend > 1000) {
                window.lastLiveSend = Date.now();

                fetch("http://127.0.0.1:5001/api/v1/motion/live", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        patient_id: AppState.currentUser?.email || "demo_patient",
                        angle: Math.round(smoothAngle),
                        stability: stabilityScore,
                        reps: window.repCount || 0,
                        duration: ((Date.now() - window.sessionStart) / 1000).toFixed(1),
                        alert: stabilityScore < 70 ? "⚠️ Unstable form" : "✅ Stable"
                    })
                }).catch((err) => console.warn("Live update failed:", err));
            }

            ctx.strokeStyle = "#22c55e";
            ctx.lineWidth = 3;
            const connect = (i, j) => {
                const a = lm[i], b = lm[j];
                ctx.beginPath();
                ctx.moveTo(a.x * canvasEl.width, a.y * canvasEl.height);
                ctx.lineTo(b.x * canvasEl.width, b.y * canvasEl.height);
                ctx.stroke();
            };
            connect(23, 25);
            connect(25, 27);
            connect(24, 26);
            connect(26, 28);
        }
    });

    const camera = new Camera(videoEl, {
        onFrame: async () => await pose.send({ image: videoEl }),
        width: 500,
        height: 380,
    });

    const stopBtn = document.getElementById("stopMotionBtn");

    startBtn.onclick = () => {
        startBtn.disabled = true;
        startBtn.textContent = "Tracking Live...";
        if (stopBtn) stopBtn.style.display = "inline-block";
        camera.start();

        window.sessionStart = Date.now();
        window.repCount = 0;
        window.stabilityScores = [];
    };

    if (stopBtn) {
        stopBtn.onclick = () => {
            stopBtn.style.display = "none";
            startBtn.disabled = false;
            startBtn.textContent = "Start Motion Tracking";
            camera.stop();

            const duration = ((Date.now() - window.sessionStart) / 1000).toFixed(1);
            const avgStability =
                window.stabilityScores.length > 0
                    ? (window.stabilityScores.reduce((a, b) => a + b, 0) / window.stabilityScores.length).toFixed(1)
                    : "--";
            const bestStability =
                window.stabilityScores.length > 0
                    ? Math.max(...window.stabilityScores).toFixed(1)
                    : "--";

            const durEl = document.getElementById("summaryDuration");
            const repsEl = document.getElementById("summaryReps");
            const avgEl = document.getElementById("summaryAvgStability");
            const bestEl = document.getElementById("summaryBestStability");
            const commentEl = document.getElementById("summaryComment");
            const modalEl = document.getElementById("sessionSummaryModal");

            if (durEl) durEl.textContent = `${duration}s`;
            if (repsEl) repsEl.textContent = window.repCount || 0;
            if (avgEl) avgEl.textContent = avgStability;
            if (bestEl) bestEl.textContent = bestStability;

            let comment = "Great control! Keep it steady next time.";
            if (avgStability > 90) comment = "🔥 Excellent form and balance!";
            else if (avgStability > 80) comment = "✅ Good session — nearly perfect!";
            else if (avgStability > 65) comment = "⚠️ Some wobble detected, focus on smooth movement.";
            else comment = "🚨 High instability, try slower controlled reps next time.";

            if (commentEl) commentEl.textContent = comment;
            if (modalEl) modalEl.style.display = "flex";
        };
    }
}

function getAngle(A, B, C) {
    const AB = { x: A.x - B.x, y: A.y - B.y };
    const CB = { x: C.x - B.x, y: C.y - B.y };
    const dot = AB.x * CB.x + AB.y * CB.y;
    const magAB = Math.sqrt(AB.x ** 2 + AB.y ** 2);
    const magCB = Math.sqrt(CB.x ** 2 + CB.y ** 2);
    const cos = dot / (magAB * magCB);
    return Math.acos(cos) * (180 / Math.PI);
}

function loadScript(url) {
    return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = url;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

// Hook motion tracking into tab selection (only if tab exists)
const originalShowDoctorTab = window.showDoctorTab;
window.showDoctorTab = function(tabName) {
    originalShowDoctorTab(tabName);
    if (tabName === "motion") {
        setTimeout(() => {
            initMotionTracking().catch(err => {
                console.error("Motion tracking failed:", err);
                alert("Camera or MediaPipe failed to start. Please allow camera permissions.");
            });
        }, 300);
    }
};


/* ==============================
   SESSION SUMMARY & LIVE TRACKER
============================== */

const closeSummaryBtn = document.getElementById("closeSummaryBtn");
if (closeSummaryBtn) {
    closeSummaryBtn.onclick = () => {
        const modal = document.getElementById("sessionSummaryModal");
        if (modal) modal.style.display = "none";
    };
}

const downloadReportBtn = document.getElementById("downloadReportBtn");
if (downloadReportBtn) {
    downloadReportBtn.onclick = () => {
        const msg = new SpeechSynthesisUtterance("Report downloaded successfully.");
        window.speechSynthesis.speak(msg);
        alert("📄 Report download feature coming soon!");
    };
}

const watchPatientBtn = document.getElementById("watchPatientBtn");
if (watchPatientBtn) {
    watchPatientBtn.onclick = () => {
        const emailInput = document.getElementById("patientEmailInput");
        if (!emailInput) return;
        const patientEmail = emailInput.value.trim();
        if (!patientEmail) {
            alert("Please enter a patient email to monitor.");
            return;
        }

        const liveFeed = document.getElementById("livePatientFeed");
        if (liveFeed) liveFeed.style.display = "block";

        if (window.liveMonitorInterval) clearInterval(window.liveMonitorInterval);
        window.liveMonitorInterval = setInterval(async () => {
            try {
                const res = await fetch(`http://127.0.0.1:5001/api/v1/motion/live/${patientEmail}`);
                const data = await res.json();

                const liveAlertEl = document.getElementById("liveAlert");
                if (data.status === "inactive") {
                    if (liveAlertEl) {
                        liveAlertEl.textContent = "❌ No active session";
                        liveAlertEl.style.color = "#ef4444";
                    }
                    return;
                }

                const angleEl = document.getElementById("liveAngle");
                const stabilityEl = document.getElementById("liveStability");
                const repsEl = document.getElementById("liveReps");
                const durationEl = document.getElementById("liveDuration");

                if (angleEl) angleEl.textContent = data.angle ?? "--";
                if (stabilityEl) stabilityEl.textContent = data.stability ?? "--";
                if (repsEl) repsEl.textContent = data.reps ?? "--";
                if (durationEl) durationEl.textContent = data.duration ?? "--";
                if (liveAlertEl) {
                    liveAlertEl.textContent = data.alert ?? "--";
                    liveAlertEl.style.color =
                        data.stability > 85 ? "#22c55e" : data.stability > 70 ? "#facc15" : "#ef4444";
                }

            } catch (err) {
                console.warn("Live tracking fetch failed:", err);
            }
        }, 2000);
    };
}
