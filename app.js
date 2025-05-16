// DOM Elements
const elements = {
    app: document.getElementById('app'),
    authSection: document.getElementById('authSection'),
    dashboard: document.getElementById('dashboard'),
    authBtn: document.getElementById('authBtn'),
    shareBtn: document.getElementById('shareBtn'),
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    showRegisterBtn: document.getElementById('showRegisterBtn'),
    showLoginBtn: document.getElementById('showLoginBtn'),
    loginBtn: document.getElementById('loginBtn'),
    registerBtn: document.getElementById('registerBtn'),
    emailInput: document.getElementById('emailInput'),
    passwordInput: document.getElementById('passwordInput'),
    nameInput: document.getElementById('nameInput'),
    regEmailInput: document.getElementById('regEmailInput'),
    regPasswordInput: document.getElementById('regPasswordInput'),
    shareCodeInput: document.getElementById('shareCodeInput'),
    copyCodeBtn: document.getElementById('copyCodeBtn'),
    viewCodeInput: document.getElementById('viewCodeInput'),
    viewCodeBtn: document.getElementById('viewCodeBtn'),
    viewOthersContainer: document.getElementById('viewOthersContainer'),
    studyForm: document.getElementById('studyForm'),
    subjectSelect: document.getElementById('subjectSelect'),
    durationInput: document.getElementById('durationInput'),
    dateInput: document.getElementById('dateInput'),
    todayHours: document.getElementById('todayHours'),
    todayComparison: document.getElementById('todayComparison'),
    weekHours: document.getElementById('weekHours'),
    weekComparison: document.getElementById('weekComparison')
};

// Chart instances
let charts = {
    today: null,
    week: null,
    daily: null,
    subject: null
};

// Previous data for comparison
let previousData = {
    today: 0,
    week: 0
};

// Initialize the app
function initApp() {
    // Set today's date as default
    const today = new Date();
    elements.dateInput.valueAsDate = today;
    
    // Format date as YYYY-MM-DD
    const formattedDate = today.toISOString().split('T')[0];
    elements.dateInput.value = formattedDate;
    
    // Auth state listener
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            showDashboard();
            generateShareCode(user.uid);
            loadUserData(user.uid);
        } else {
            // User is signed out
            showAuthSection();
        }
    });
    
    // Set up event listeners
    setupEventListeners();
}

// Show dashboard and hide auth section
function showDashboard() {
    elements.authSection.classList.add('hidden');
    elements.dashboard.classList.remove('hidden');
    elements.authBtn.textContent = 'Sign Out';
    elements.shareBtn.classList.remove('hidden');
}

// Show auth section and hide dashboard
function showAuthSection() {
    elements.authSection.classList.remove('hidden');
    elements.dashboard.classList.add('hidden');
    elements.authBtn.textContent = 'Sign In';
    elements.shareBtn.classList.add('hidden');
}

// Generate or retrieve user's share code
async function generateShareCode(uid) {
    try {
        const userRef = dbRef.child('users').child(uid);
        const snapshot = await userRef.once('value');
        
        if (snapshot.exists() && snapshot.val().shareCode) {
            elements.shareCodeInput.value = snapshot.val().shareCode;
        } else {
            await createShareCode(uid);
        }
    } catch (error) {
        showToast('Error generating share code', true);
        console.error(error);
    }
}

// Create a new share code for user
async function createShareCode(uid) {
    try {
        const code = generateRandomCode(6);
        await dbRef.child('users').child(uid).set({
            shareCode: code,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        elements.shareCodeInput.value = code;
        showToast('Share code generated!');
    } catch (error) {
        showToast('Error creating share code', true);
        console.error(error);
    }
}

// Generate random alphanumeric code
function generateRandomCode(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Load user data and set up real-time listener
function loadUserData(uid) {
    // Set up real-time listener for study sessions
    dbRef.child('studySessions')
        .orderByChild('userId')
        .equalTo(uid)
        .on('value', snapshot => {
            const sessions = [];
            snapshot.forEach(childSnapshot => {
                sessions.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            
            if (sessions.length > 0) {
                updateCharts(sessions);
            } else {
                initEmptyCharts();
            }
        });
}

// Initialize empty charts
function initEmptyCharts() {
    charts.today = createDoughnutChart('todayChart', ['Completed', 'Remaining'], [0, 8], ['#4c51bf', '#e2e8f0']);
    charts.week = createDoughnutChart('weekChart', ['Completed', 'Remaining'], [0, 40], ['#4299e1', '#e2e8f0']);
    charts.daily = createBarChart('dailyChart', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], [0, 0, 0, 0, 0, 0, 0]);
    charts.subject = createPieChart('subjectChart', [], [], ['#4c51bf', '#4299e1', '#48bb78', '#ed8936', '#9f7aea', '#f56565']);
}

// Process session data for charts
function processSessionData(sessions) {
    const dailyData = {};
    const subjectData = {};
    let totalHours = 0;
    const today = new Date().toISOString().split('T')[0];
    let todayHours = 0;
    
    sessions.forEach(session => {
        const date = session.date;
        const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
        
        // Daily data
        if (!dailyData[date]) {
            dailyData[date] = { dayName, hours: 0 };
        }
        dailyData[date].hours += session.duration;
        
        // Subject data
        if (!subjectData[session.subject]) {
            subjectData[session.subject] = 0;
        }
        subjectData[session.subject] += session.duration;
        
        // Total hours
        totalHours += session.duration;
        
        // Today's hours
        if (date === today) {
            todayHours += session.duration;
        }
    });
    
    // Weekly hours (last 7 days)
    const weeklyHours = calculateLastNDaysTotal(dailyData, 7);
    
    return {
        todayHours,
        weeklyHours,
        dailyData,
        subjectData,
        totalHours
    };
}

// Calculate total hours for last N days
function calculateLastNDaysTotal(dailyData, days) {
    let total = 0;
    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        total += dailyData[dateStr] ? dailyData[dateStr].hours : 0;
    }
    return total;
}

// Update charts with new data
function updateCharts(sessions) {
    const { todayHours, weeklyHours, dailyData, subjectData } = processSessionData(sessions);
    
    // Update today's hours display
    elements.todayHours.textContent = todayHours.toFixed(1);
    updateComparison('today', todayHours);
    
    // Update weekly hours display
    elements.weekHours.textContent = weeklyHours.toFixed(1);
    updateComparison('week', weeklyHours);
    
    // Update or create today's chart
    if (charts.today) {
        charts.today.data.datasets[0].data = [todayHours, Math.max(0, 8 - todayHours)];
        charts.today.update();
    } else {
        charts.today = createDoughnutChart('todayChart', ['Completed', 'Remaining'], [todayHours, Math.max(0, 8 - todayHours)], ['#4c51bf', '#e2e8f0']);
    }
    
    // Update or create weekly chart
    if (charts.week) {
        charts.week.data.datasets[0].data = [weeklyHours, Math.max(0, 40 - weeklyHours)];
        charts.week.update();
    } else {
        charts.week = createDoughnutChart('weekChart', ['Completed', 'Remaining'], [weeklyHours, Math.max(0, 40 - weeklyHours)], ['#4299e1', '#e2e8f0']);
    }
    
    // Update or create daily chart
    const last7DaysData = getLast7DaysData(dailyData);
    if (charts.daily) {
        charts.daily.data.datasets[0].data = last7DaysData.hours;
        charts.daily.data.labels = last7DaysData.days;
        charts.daily.update();
    } else {
        charts.daily = createBarChart('dailyChart', last7DaysData.days, last7DaysData.hours);
    }
    
    // Update or create subject chart
    const subjectLabels = Object.keys(subjectData);
    const subjectValues = Object.values(subjectData);
    if (charts.subject) {
        charts.subject.data.labels = subjectLabels;
        charts.subject.data.datasets[0].data = subjectValues;
        charts.subject.update();
    } else {
        charts.subject = createPieChart('subjectChart', subjectLabels, subjectValues);
    }
    
    // Store current values for next comparison
    previousData.today = todayHours;
    previousData.week = weeklyHours;
}

// Update comparison text
function updateComparison(type, currentValue) {
    const previousValue = previousData[type];
    const difference = currentValue - previousValue;
    const element = type === 'today' ? elements.todayComparison : elements.weekComparison;
    
    if (previousValue === 0) {
        element.textContent = 'No previous data';
        return;
    }
    
    if (difference > 0) {
        element.textContent = `+${difference.toFixed(1)}hrs from last ${type}`;
        element.className = 'text-gray-500 text-green-500';
    } else if (difference < 0) {
        element.textContent = `${difference.toFixed(1)}hrs from last ${type}`;
        element.className = 'text-gray-500 text-red-500';
    } else {
        element.textContent = `Same as last ${type}`;
        element.className = 'text-gray-500';
    }
}

// Get last 7 days data for chart
function getLast7DaysData(dailyData) {
    const days = [];
    const hours = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = dayNames[date.getDay()];
        
        days.push(dayName);
        hours.push(dailyData[dateStr] ? dailyData[dateStr].hours : 0);
    }
    
    return { days, hours };
}

// Create doughnut chart
function createDoughnutChart(canvasId, labels, data, colors) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderWidth: 0
            }]
        },
        options: {
            cutout: '70%',
            plugins: { legend: { display: false } },
            maintainAspectRatio: false
        }
    });
}

// Create bar chart
function createBarChart(canvasId, labels, data) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Study Hours',
                data,
                backgroundColor: '#667eea',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Hours' } }
            },
            maintainAspectRatio: false
        }
    });
}

// Create pie chart
function createPieChart(canvasId, labels, data) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'pie',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: [
                    '#4c51bf',
                    '#4299e1',
                    '#48bb78',
                    '#ed8936',
                    '#9f7aea',
                    '#f56565'
                ].slice(0, labels.length),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'right' } },
            maintainAspectRatio: false
        }
    });
}

// Show toast notification
function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Set up event listeners
function setupEventListeners() {
    // Auth buttons
    elements.authBtn.addEventListener('click', handleAuthButtonClick);
    elements.showRegisterBtn.addEventListener('click', () => toggleAuthForms(true));
    elements.showLoginBtn.addEventListener('click', () => toggleAuthForms(false));
    elements.loginBtn.addEventListener('click', handleLogin);
    elements.registerBtn.addEventListener('click', handleRegister);
    
    // Share functionality
    elements.copyCodeBtn.addEventListener('click', copyShareCode);
    elements.viewCodeBtn.addEventListener('click', handleViewCode);
    
    // Study session form
    elements.studyForm.addEventListener('submit', handleStudySessionSubmit);
}

// Toggle between login and register forms
function toggleAuthForms(showRegister) {
    elements.loginForm.classList.toggle('hidden', showRegister);
    elements.registerForm.classList.toggle('hidden', !showRegister);
}

// Handle auth button click
async function handleAuthButtonClick() {
    if (elements.authBtn.textContent === 'Sign Out') {
        try {
            await auth.signOut();
            showToast('Signed out successfully');
        } catch (error) {
            showToast('Error signing out', true);
            console.error(error);
        }
    }
}

// Handle login
async function handleLogin() {
    const email = elements.emailInput.value.trim();
    const password = elements.passwordInput.value;
    
    if (!validateEmail(email) || !password) {
        showToast('Please enter valid email and password', true);
        return;
    }
    
    try {
        elements.loginBtn.innerHTML = '<div class="spinner"></div>';
        await auth.signInWithEmailAndPassword(email, password);
        showToast('Signed in successfully');
    } catch (error) {
        handleAuthError(error);
        elements.loginBtn.textContent = 'Sign In';
    }
}

// Handle registration
async function handleRegister() {
    const email = elements.regEmailInput.value.trim();
    const password = elements.regPasswordInput.value;
    const name = elements.nameInput.value.trim();
    
    if (!validateEmail(email) || password.length < 6 || !name) {
        showToast('Please fill all fields (password min 6 chars)', true);
        return;
    }
    
    try {
        elements.registerBtn.innerHTML = '<div class="spinner"></div>';
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        await dbRef.child('users').child(userCredential.user.uid).set({
            name,
            email,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        showToast('Account created successfully');
    } catch (error) {
        handleAuthError(error);
        elements.registerBtn.textContent = 'Register';
    }
}

// Validate email format
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Handle auth errors
function handleAuthError(error) {
    let message = 'Authentication error';
    
    switch (error.code) {
        case 'auth/email-already-in-use':
            message = 'Email already in use';
            break;
        case 'auth/invalid-email':
            message = 'Invalid email address';
            break;
        case 'auth/weak-password':
            message = 'Password should be at least 6 characters';
            break;
        case 'auth/user-not-found':
            message = 'User not found';
            break;
        case 'auth/wrong-password':
            message = 'Incorrect password';
            break;
        case 'auth/too-many-requests':
            message = 'Too many attempts. Try again later';
            break;
    }
    
    showToast(message, true);
}

// Copy share code to clipboard
async function copyShareCode() {
    try {
        await navigator.clipboard.writeText(elements.shareCodeInput.value);
        showToast('Share code copied!');
    } catch (error) {
        showToast('Failed to copy code', true);
    }
}

// Handle viewing another user's stats
async function handleViewCode() {
    const code = elements.viewCodeInput.value.trim().toUpperCase();
    
    if (!code) {
        showToast('Please enter a share code', true);
        return;
    }
    
    try {
        elements.viewCodeBtn.innerHTML = '<div class="spinner"></div>';
        elements.viewOthersContainer.classList.add('hidden');
        
        // Find user with this share code
        const usersSnapshot = await dbRef.child('users')
            .orderByChild('shareCode')
            .equalTo(code)
            .once('value');
        
        if (!usersSnapshot.exists()) {
            throw new Error('No user found with this share code');
        }
        
        // Get the first user (should be only one)
        let userId, userName;
        usersSnapshot.forEach(childSnapshot => {
            userId = childSnapshot.key;
            userName = childSnapshot.val().name || 'Anonymous';
            return true; // Break after first match
        });
        
        // Get their study sessions
        const sessionsSnapshot = await dbRef.child('studySessions')
            .orderByChild('userId')
            .equalTo(userId)
            .once('value');
        
        const sessions = [];
        sessionsSnapshot.forEach(childSnapshot => {
            sessions.push(childSnapshot.val());
        });
        
        displaySharedStats(userName, sessions);
    } catch (error) {
        showToast(error.message, true);
    } finally {
        elements.viewCodeBtn.textContent = 'View';
    }
}

// Display shared user stats
function displaySharedStats(userName, sessions) {
    if (sessions.length === 0) {
        elements.viewOthersContainer.innerHTML = `
            <div class="bg-purple-50 rounded-lg p-6">
                <p class="text-center text-gray-600">${userName} hasn't recorded any study sessions yet</p>
            </div>
        `;
        elements.viewOthersContainer.classList.remove('hidden');
        return;
    }
    
    const { totalHours, subjectData } = processSessionData(sessions);
    const favoriteSubject = getFavoriteSubject(subjectData);
    const weeklyAverage = calculateWeeklyAverage(sessions);
    
    elements.viewOthersContainer.innerHTML = `
        <div class="bg-purple-50 rounded-lg p-6 animate__animated animate__fadeIn">
            <h4 class="text-lg font-semibold text-purple-800 mb-4">${userName}'s Study Stats</h4>
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-white rounded-lg p-4 shadow">
                    <p class="text-gray-500">Total Hours</p>
                    <p class="text-2xl font-bold text-purple-600">${totalHours.toFixed(1)}</p>
                </div>
                <div class="bg-white rounded-lg p-4 shadow">
                    <p class="text-gray-500">Favorite Subject</p>
                    <p class="text-2xl font-bold text-purple-600">${favoriteSubject}</p>
                </div>
            </div>
            <div class="mt-4 bg-white rounded-lg p-4 shadow">
                <p class="text-gray-500">Weekly Average</p>
                <p class="text-2xl font-bold text-purple-600">${weeklyAverage} hrs</p>
            </div>
            <div class="mt-4 bg-white rounded-lg p-4 shadow">
                <p class="text-gray-500">Subject Distribution</p>
                <div class="h-48 mt-2">
                    <canvas id="viewedSubjectChart"></canvas>
                </div>
            </div>
        </div>
    `;
    
    renderViewedSubjectChart(subjectData);
    elements.viewOthersContainer.classList.remove('hidden');
}

// Get favorite subject from data
function getFavoriteSubject(subjectData) {
    let favorite = 'None';
    let maxHours = 0;
    
    for (const [subject, hours] of Object.entries(subjectData)) {
        if (hours > maxHours) {
            maxHours = hours;
            favorite = subject.charAt(0).toUpperCase() + subject.slice(1);
        }
    }
    
    return favorite;
}

// Calculate weekly average hours
function calculateWeeklyAverage(sessions) {
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    
    const weeklyHours = sessions
        .filter(s => new Date(s.date) >= fourWeeksAgo)
        .reduce((sum, s) => sum + s.duration, 0);
    
    return (weeklyHours / 4).toFixed(1);
}

// Render subject chart for viewed user
function renderViewedSubjectChart(subjectData) {
    const ctx = document.getElementById('viewedSubjectChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(subjectData),
            datasets: [{
                data: Object.values(subjectData),
                backgroundColor: [
                    '#4c51bf',
                    '#4299e1',
                    '#48bb78',
                    '#ed8936',
                    '#9f7aea',
                    '#f56565'
                ].slice(0, Object.keys(subjectData).length),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } },
            maintainAspectRatio: false
        }
    });
}

// Handle study session submission
async function handleStudySessionSubmit(e) {
    e.preventDefault();
    
    const user = auth.currentUser;
    if (!user) {
        showToast('Please sign in to add sessions', true);
        return;
    }
    
    const subject = elements.subjectSelect.value;
    const duration = parseFloat(elements.durationInput.value);
    const date = elements.dateInput.value;
    
    if (!subject || !duration || duration <= 0 || !date) {
        showToast('Please enter valid session details', true);
        return;
    }
    
    const submitBtn = elements.studyForm.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<div class="spinner"></div>';
    submitBtn.disabled = true;
    
    try {
        const newSessionRef = dbRef.child('studySessions').push();
        await newSessionRef.set({
            userId: user.uid,
            subject,
            duration,
            date,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        showToast(`Added ${duration} hours of ${subject} study`);
        elements.durationInput.value = '1';
        elements.dateInput.valueAsDate = new Date();
    } catch (error) {
        showToast('Error adding session', true);
        console.error(error);
    } finally {
        submitBtn.textContent = 'Add Session';
        submitBtn.disabled = false;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
