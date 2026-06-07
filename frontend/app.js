/* ==========================================================================
   SMARTQUEUE MANAGEMENT SYSTEM - CLIENT CONTROLLER (VANILLA JS)
   ========================================================================== */

// Determine API Base URL. Auto-connects to local backend when on localhost, and your Render backend in production.
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8080'
    : 'https://java-aat-47-3.onrender.com';

// ==========================================================================
// LOCAL DEMO & OFFLINE SIMULATION LAYER
// ==========================================================================
let useSimulationMode = false;

// Mock database initializers
function getSimData(key, defaultVal) {
    const val = localStorage.getItem(key);
    if (!val) {
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
    }
    return JSON.parse(val);
}

function setSimData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Initial Mock DB (Seeds)
const mockQueues = [
    { queueId: 1, queueName: "General Inquiry Counter", currentToken: 0 },
    { queueId: 2, queueName: "Cashier & Billing Department", currentToken: 0 },
    { queueId: 3, queueName: "Technical Support Desk", currentToken: 0 }
];

const mockUsers = [
    { userId: 1, name: "Manager Admin", email: "admin@smartqueue.com", phone: "+1 555-0199", role: "Admin", password: "admin" },
    { userId: 2, name: "Sarah Connor (Desk A)", email: "sarah@smartqueue.com", phone: "+1 555-0101", role: "Staff", password: "staff" },
    { userId: 3, name: "John Connor (Desk B)", email: "john@smartqueue.com", phone: "+1 555-0102", role: "Staff", password: "staff" },
    { userId: 4, name: "Default Customer", email: "customer@smartqueue.com", phone: "+1 555-0103", role: "Customer", password: "customer" }
];

const mockTokens = [];

// Simulate Spring Boot REST Controller endpoints in-browser
function simulateApiCall(path, method, options) {
    let queues = getSimData("SQ_SIM_QUEUES", mockQueues);
    let users = getSimData("SQ_SIM_USERS", mockUsers);
    let tokens = getSimData("SQ_SIM_TOKENS", mockTokens);
    let notifications = getSimData("SQ_SIM_NOTIFICATIONS", []);
    let serviceHistories = getSimData("SQ_SIM_HISTORY", []);

    const makeResponse = (data, status = 200) => {
        return {
            ok: status >= 200 && status < 300,
            status: status,
            json: async () => data,
            text: async () => typeof data === 'string' ? data : JSON.stringify(data)
        };
    };

    // 1. GET /queues
    if (path === '/queues' && method === 'GET') {
        return makeResponse(queues);
    }
    
    // 2. POST /queues
    if (path === '/queues' && method === 'POST') {
        const newQ = JSON.parse(options.body);
        newQ.queueId = queues.length > 0 ? Math.max(...queues.map(q => q.queueId)) + 1 : 1;
        queues.push(newQ);
        setSimData("SQ_SIM_QUEUES", queues);
        return makeResponse(newQ, 201);
    }

    // 3. GET /users
    if (path === '/users' && method === 'GET') {
        return makeResponse(users);
    }

    // 4. POST /users
    if (path === '/users' && method === 'POST') {
        const newU = JSON.parse(options.body);
        newU.userId = users.length > 0 ? Math.max(...users.map(u => u.userId)) + 1 : 1;
        users.push(newU);
        setSimData("SQ_SIM_USERS", users);
        return makeResponse(newU, 201);
    }

    // 5. GET /tokens
    if (path === '/tokens' && method === 'GET') {
        return makeResponse(tokens);
    }

    // 6. POST /tokens (Create / Update Token)
    if (path === '/tokens' && method === 'POST') {
        const tokenPayload = JSON.parse(options.body);
        if (tokenPayload.tokenId) {
            const idx = tokens.findIndex(t => t.tokenId === tokenPayload.tokenId);
            if (idx !== -1) {
                tokens[idx] = tokenPayload;
                setSimData("SQ_SIM_TOKENS", tokens);
                return makeResponse(tokenPayload);
            }
        }
        tokenPayload.tokenId = tokens.length > 0 ? Math.max(...tokens.map(t => t.tokenId)) + 1 : 1;
        
        if (!tokenPayload.createdAt) {
            tokenPayload.createdAt = toLocalISOString(new Date());
        }
        
        const qId = tokenPayload.queue.queueId;
        const qObj = queues.find(q => q.queueId === qId);
        tokenPayload.queue = qObj;

        tokens.push(tokenPayload);
        setSimData("SQ_SIM_TOKENS", tokens);
        return makeResponse(tokenPayload, 201);
    }

    // 7. GET /tokens/queue/{queueId}
    if (path.startsWith('/tokens/queue/') && method === 'GET') {
        const qId = parseInt(path.split('/').pop());
        const filtered = tokens.filter(t => t.queue && t.queue.queueId === qId);
        return makeResponse(filtered);
    }

    // 7b. GET /tokens/user/{userId}
    if (path.startsWith('/tokens/user/') && method === 'GET') {
        const uId = parseInt(path.split('/').pop());
        const filtered = tokens.filter(t => t.user && t.user.userId === uId)
                               .sort((a, b) => b.tokenId - a.tokenId);
        return makeResponse(filtered);
    }

    // 8. GET /tokens/{tokenId}
    if (path.match(/^\/tokens\/\d+$/) && method === 'GET') {
        const tId = parseInt(path.split('/').pop());
        const tk = tokens.find(t => t.tokenId === tId);
        if (tk) return makeResponse(tk);
        return makeResponse({ error: "Not Found" }, 404);
    }

    // 9. DELETE /tokens/{tokenId}
    if (path.match(/^\/tokens\/\d+$/) && method === 'DELETE') {
        const tId = parseInt(path.split('/').pop());
        tokens = tokens.filter(t => t.tokenId !== tId);
        setSimData("SQ_SIM_TOKENS", tokens);
        return makeResponse({ message: "Deleted" });
    }

    // 10. PUT /tokens/next/{queueId}
    if (path.startsWith('/tokens/next/') && method === 'PUT') {
        const qId = parseInt(path.split('/').pop());
        const waiting = tokens.filter(t => t.queue && t.queue.queueId === qId && t.status === 'WAITING')
                             .sort((a, b) => a.tokenNumber - b.tokenNumber);
        
        if (waiting.length === 0) {
            return makeResponse("", 204);
        }

        const nextToken = waiting[0];
        nextToken.status = "SERVING";
        
        const qIdx = queues.findIndex(q => q.queueId === qId);
        if (qIdx !== -1) {
            queues[qIdx].currentToken = nextToken.tokenNumber;
            setSimData("SQ_SIM_QUEUES", queues);
        }

        setSimData("SQ_SIM_TOKENS", tokens);
        return makeResponse(nextToken);
    }

    // 11. PUT /tokens/complete/{tokenId}
    if (path.startsWith('/tokens/complete/') && method === 'PUT') {
        const tId = parseInt(path.split('/').pop());
        const tk = tokens.find(t => t.tokenId === tId);
        if (tk) {
            tk.status = "COMPLETED";
            setSimData("SQ_SIM_TOKENS", tokens);
            return makeResponse(tk);
        }
        return makeResponse({ error: "Not Found" }, 404);
    }

    // 12. PUT /tokens/{tokenId}/status?status=SERVING (Update status / Assign user)
    if (path.match(/^\/tokens\/\d+\/status\?status=/) && method === 'PUT') {
        const parts = path.split('?');
        const tId = parseInt(parts[0].replace('/status', '').split('/').pop());
        const statusVal = parts[1].split('=').pop();
        const tk = tokens.find(t => t.tokenId === tId);
        if (tk) {
            tk.status = statusVal;
            setSimData("SQ_SIM_TOKENS", tokens);
            return makeResponse(tk);
        }
        return makeResponse({ error: "Not Found" }, 404);
    }

    // 13. GET /notifications
    if (path === '/notifications' && method === 'GET') {
        return makeResponse(notifications);
    }

    // 14. POST /notifications
    if (path === '/notifications' && method === 'POST') {
        const newN = JSON.parse(options.body);
        newN.notificationId = notifications.length > 0 ? Math.max(...notifications.map(n => n.notificationId)) + 1 : 1;
        notifications.push(newN);
        setSimData("SQ_SIM_NOTIFICATIONS", notifications);
        return makeResponse(newN, 201);
    }

    // 15. GET /service-history
    if (path === '/service-history' && method === 'GET') {
        return makeResponse(serviceHistories);
    }

    // 16. POST /service-history
    if (path === '/service-history' && method === 'POST') {
        const newH = JSON.parse(options.body);
        newH.serviceId = serviceHistories.length > 0 ? Math.max(...serviceHistories.map(h => h.serviceId)) + 1 : 1;
        
        // Populate token object if passed as ID/partial object
        if (newH.token && newH.token.tokenId) {
            const tkObj = tokens.find(t => t.tokenId === newH.token.tokenId);
            if (tkObj) newH.token = tkObj;
        }

        serviceHistories.push(newH);
        setSimData("SQ_SIM_HISTORY", serviceHistories);
        return makeResponse(newH, 201);
    }

    return makeResponse({ error: "Bad Request" }, 400);
}

// Override Global Fetch
const originalFetch = window.fetch;
window.fetch = async function(resource, init) {
    const resourceUrl = typeof resource === 'string' ? resource : resource.url;
    
    // Check if the resource is one of the Spring Boot REST endpoints
    const isApiCall = resourceUrl.includes('/queues') || 
                      resourceUrl.includes('/tokens') || 
                      resourceUrl.includes('/users') ||
                      resourceUrl.includes('/notifications') ||
                      resourceUrl.includes('/service-history');
                      
    if (!isApiCall) {
        return originalFetch(resource, init);
    }
    
    const method = (init && init.method) || 'GET';
    const cleanPath = resourceUrl.replace(API_BASE, '');
    
    if (useSimulationMode) {
        return simulateApiCall(cleanPath, method, init);
    }
    
    try {
        const response = await originalFetch(resource, init);
        return response;
    } catch (error) {
        console.warn("Backend API unreachable. Falling back to Local Simulation Mode:", error);
        useSimulationMode = true;
        if (typeof updateConnectionStatus === 'function') {
            updateConnectionStatus(false);
        }
        if (typeof showToast === 'function') {
            showToast("Server offline. Switch to Local Simulation Active!");
        }
        return simulateApiCall(cleanPath, method, init);
    }
};

// Audio Toggle State
let audioEnabled = true;

// Active Refresh Interval ID
let refreshIntervalId = null;

// Active User Session State
let userSession = null;

// Page Load Initialization
document.addEventListener("DOMContentLoaded", () => {
    // Render Icons
    lucide.createIcons();
    
    // Initialize Audio Toggle
    initAudioToggle();

    // Always start at the login screen (clear active session on load)
    localStorage.removeItem("SQ_USER_SESSION");
    userSession = null;
    showLoginScreen();

    // Check Local Storage for Customer Ticket
    loadCustomerTicket();

    // Load initial dropdown list of queues
    loadQueueDropdowns();

    // Load initial dropdown list of users
    loadUserDropdowns();

    // Set up Auto-Refresh Interval
    startAutoRefresh();
});

// Credentials Autofill Helper
function fillCredentials(email, password) {
    document.getElementById("authEmail").value = email;
    document.getElementById("authPassword").value = password;
}

// HackerRank entrance toggle logic
let currentAuthType = 'customer'; // 'customer' or 'staff'
let currentAuthMode = 'signin';   // 'signin' or 'register'

function showAuthForm(type, mode) {
    currentAuthType = type;
    currentAuthMode = mode;

    const screenSelection = document.getElementById("selection-screen");
    const screenAuth = document.getElementById("auth-form-screen");
    
    screenSelection.classList.add("hidden");
    screenAuth.classList.remove("hidden");

    // Get input wrappers
    const fieldName = document.getElementById("field-name");
    const fieldPhone = document.getElementById("field-phone");
    const fieldRole = document.getElementById("field-role");
    
    const inputName = document.getElementById("authName");
    const inputPhone = document.getElementById("authPhone");
    const inputRole = document.getElementById("authRoleSelect");
    const inputEmail = document.getElementById("authEmail");
    const inputPassword = document.getElementById("authPassword");

    // Clear form inputs
    inputName.value = "";
    inputPhone.value = "";
    inputEmail.value = "";
    inputPassword.value = "";

    // Toggle fields based on mode
    if (mode === 'register') {
        document.getElementById("auth-title").innerText = type === 'customer' ? "Customer Registration" : "Service Agent Register";
        document.getElementById("auth-subtitle").innerText = "Create your account to join the queue management system.";
        
        fieldName.classList.remove("hidden");
        inputName.required = true;
        
        fieldPhone.classList.remove("hidden");
        inputPhone.required = false; // Optional
        
        if (type === 'staff') {
            fieldRole.classList.remove("hidden");
        } else {
            fieldRole.classList.add("hidden");
        }
        
        document.getElementById("authSubmitText").innerText = "Register Account";
        document.getElementById("authSubmitIcon").className = ""; // Reset
        document.getElementById("authSubmitIcon").setAttribute("data-lucide", "user-plus");
    } else {
        document.getElementById("auth-title").innerText = type === 'customer' ? "Customer Sign In" : "Staff & Admin Sign In";
        document.getElementById("auth-subtitle").innerText = "Enter your registered credentials to sign in.";
        
        fieldName.classList.add("hidden");
        inputName.required = false;
        
        fieldPhone.classList.add("hidden");
        inputPhone.required = false;
        
        fieldRole.classList.add("hidden");
        
        document.getElementById("authSubmitText").innerText = "Sign In";
        document.getElementById("authSubmitIcon").className = ""; // Reset
        document.getElementById("authSubmitIcon").setAttribute("data-lucide", "log-in");
    }

    // Generate credentials helper badges
    const badgesArea = document.getElementById("autofill-badges");
    badgesArea.innerHTML = "";
    
    if (mode === 'signin' && type !== 'customer') {
        document.getElementById("login-helper-area").classList.remove("hidden");
        badgesArea.innerHTML = `
            <div class="helper-badge" onclick="fillCredentials('admin@smartqueue.com', 'admin')">
                <strong>Admin:</strong> admin@smartqueue.com / admin
            </div>
            <div class="helper-badge" onclick="fillCredentials('sarah@smartqueue.com', 'staff')">
                <strong>Staff (Sarah):</strong> sarah@smartqueue.com / staff
            </div>
            <div class="helper-badge" onclick="fillCredentials('john@smartqueue.com', 'staff')">
                <strong>Staff (John):</strong> john@smartqueue.com / staff
            </div>
        `;
    } else {
        // Hide helper credentials area for registration or customer signin
        document.getElementById("login-helper-area").classList.add("hidden");
    }

    lucide.createIcons();
}

function showSelectionScreen() {
    document.getElementById("selection-screen").classList.remove("hidden");
    document.getElementById("auth-form-screen").classList.add("hidden");
}

// Login Session Logic
function checkUserSession() {
    const sessionStr = localStorage.getItem("SQ_USER_SESSION");
    if (sessionStr) {
        try {
            userSession = JSON.parse(sessionStr);
            applyUserSession(userSession);
        } catch (e) {
            console.error("Error parsing user session:", e);
            showLoginScreen();
        }
    } else {
        showLoginScreen();
    }
}

function showLoginScreen() {
    document.getElementById("login-screen").classList.remove("hidden");
    document.getElementById("main-app").classList.add("hidden");
    showSelectionScreen();
}

function applyUserSession(session) {
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("main-app").classList.remove("hidden");
    
    // Update profile badge
    document.getElementById("headerProfileName").innerText = session.name;
    document.getElementById("currentRoleLabel").innerText = session.role;
    
    // Generate initials for avatar
    const initials = session.name ? session.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : "SQ";
    document.getElementById("headerAvatar").innerText = initials || "SQ";

    // Filter sidebar navigation
    const tabCustomer = document.getElementById("tab-customer");
    const tabStaff = document.getElementById("tab-staff");
    const tabAdmin = document.getElementById("tab-admin");

    if (session.role === 'Customer') {
        tabCustomer.classList.remove("hidden");
        tabStaff.classList.add("hidden");
        tabAdmin.classList.add("hidden");
        switchTab('customer');
    } else if (session.role === 'Staff') {
        tabCustomer.classList.add("hidden");
        tabStaff.classList.remove("hidden");
        tabAdmin.classList.add("hidden");
        switchTab('staff');
    } else if (session.role === 'Admin') {
        tabCustomer.classList.add("hidden");
        tabStaff.classList.add("hidden");
        tabAdmin.classList.remove("hidden");
        switchTab('admin');
    }
    
    lucide.createIcons();
}

async function handleAuthSubmit(event) {
    event.preventDefault();

    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value.trim();
    const name = document.getElementById("authName").value.trim();
    const phone = document.getElementById("authPhone").value.trim();
    
    let role = 'Customer';
    if (currentAuthType === 'staff' && currentAuthMode === 'register') {
        role = document.getElementById("authRoleSelect").value;
    }

    if (currentAuthMode === 'register' && role === 'Admin' && email.toLowerCase() !== 'admin@smartqueue.com') {
        showToast("Registration Denied: Admin role is locked to admin@smartqueue.com.");
        return;
    }

    if (!email || !password) {
        showToast("Please enter email and password.");
        return;
    }

    if (currentAuthMode === 'register' && !name) {
        showToast("Please enter your name.");
        return;
    }

    try {
        if (currentAuthMode === 'register') {
            // Check if user already exists
            let matchedUser = null;
            try {
                const fetchRes = await fetch(`${API_BASE}/users`);
                if (fetchRes.ok) {
                    const users = await fetchRes.json();
                    matchedUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
                }
            } catch (e) {
                console.warn("Backend API unreachable when searching existing users.");
            }

            if (!matchedUser) {
                const simUsers = getSimData("SQ_SIM_USERS", mockUsers);
                matchedUser = simUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
            }

            if (matchedUser) {
                showToast("Account already exists with this email.");
                return;
            }

            // Create new User profile
            const payload = {
                name: name,
                email: email,
                password: password,
                phone: phone,
                role: role
            };

            let newUser = null;

            // Submit to API
            try {
                const response = await fetch(`${API_BASE}/users`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    newUser = await response.json();
                } else {
                    throw new Error("API post failed");
                }
            } catch (e) {
                console.warn("Backend API unreachable. Registering in Local Simulation Mode:", e);
                useSimulationMode = true;
                
                // Add to local simulation db
                const simUsers = getSimData("SQ_SIM_USERS", mockUsers);
                payload.userId = simUsers.length > 0 ? Math.max(...simUsers.map(u => u.userId)) + 1 : 1;
                simUsers.push(payload);
                setSimData("SQ_SIM_USERS", simUsers);
                newUser = payload;
            }

            // Auto-login
            userSession = {
                userId: newUser.userId,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            };
            localStorage.setItem("SQ_USER_SESSION", JSON.stringify(userSession));
            applyUserSession(userSession);
            showToast(`Registered successfully. Welcome, ${newUser.name}!`);

        } else {
            // Sign In Mode
            let matchedUser = null;
            
            try {
                const response = await fetch(`${API_BASE}/users`);
                if (response.ok) {
                    const users = await response.json();
                    matchedUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
                }
            } catch (e) {
                console.warn("Backend API unreachable during sign in. Using simulated database.");
            }

            if (!matchedUser) {
                const simUsers = getSimData("SQ_SIM_USERS", mockUsers);
                matchedUser = simUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
            }

            if (!matchedUser) {
                showToast("Account not found. Please register first.");
                return;
            }

            if (matchedUser.role === 'Admin' && matchedUser.email.toLowerCase() !== 'admin@smartqueue.com') {
                showToast("Access Denied: Only admin@smartqueue.com is allowed admin privileges.");
                return;
            }

            // Password check
            const correctPassword = matchedUser.password || (matchedUser.role === 'Admin' ? 'admin' : matchedUser.role === 'Staff' ? 'staff' : 'customer');
            if (password !== correctPassword) {
                showToast("Incorrect password.");
                return;
            }

            // portal matching
            if (currentAuthType === 'customer' && matchedUser.role !== 'Customer') {
                showToast("Access Denied: Please use the Staff & Admin portal.");
                return;
            }
            if (currentAuthType === 'staff' && matchedUser.role === 'Customer') {
                showToast("Access Denied: Customers cannot access the Service Console.");
                return;
            }

            // Save Session
            userSession = {
                userId: matchedUser.userId,
                name: matchedUser.name,
                email: matchedUser.email,
                role: matchedUser.role
            };
            localStorage.setItem("SQ_USER_SESSION", JSON.stringify(userSession));
            applyUserSession(userSession);
            showToast(`Logged in successfully as ${matchedUser.name}`);
        }
    } catch (err) {
        console.error("Auth submission error:", err);
        showToast("Error: " + err.message);
    }
}

function handleLogoutClick() {
    localStorage.removeItem("SQ_USER_SESSION");
    userSession = null;
    const staffSelect = document.getElementById("staffUserSelect");
    if (staffSelect) {
        staffSelect.disabled = false;
        staffSelect.innerHTML = '<option value="" disabled selected>Select staff member</option>';
    }
    const staffNameDiv = document.getElementById("staffUserSelectName");
    if (staffNameDiv) {
        staffNameDiv.innerText = "Guest";
    }
    showLoginScreen();
    showToast("Signed out successfully.");
}

/* ==========================================================================
   ROUTING / TAB SWITCHING
   ========================================================================== */
function switchTab(tabName) {
    // Update navigation items active state
    document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));
    const activeTabButton = document.getElementById(`tab-${tabName}`);
    if (activeTabButton) activeTabButton.classList.add("active");

    // Update active view
    document.querySelectorAll(".dashboard-view").forEach(view => view.classList.remove("active"));
    const activeView = document.getElementById(`view-${tabName}`);
    if (activeView) activeView.classList.add("active");

    // Update Header Content
    const title = document.getElementById("view-title");
    const subtitle = document.getElementById("view-subtitle");
    const roleLabel = document.getElementById("currentRoleLabel");

    if (tabName === 'customer') {
        title.innerText = "Customer Corner";
        subtitle.innerText = "Generate tickets, track waiting times, and join active services.";
        roleLabel.innerText = "Customer";
        loadQueueDropdowns(); // Refresh options
        loadCustomerTicket(); // Refresh ticket status
    } else if (tabName === 'staff') {
        title.innerText = "Service Desk Console";
        subtitle.innerText = "Manage customer service, call next tokens, and complete sessions.";
        roleLabel.innerText = "Staff / Agent";
        
        // Restore previous staff selections from localStorage
        const storedQueue = localStorage.getItem("SQ_STAFF_QUEUE");
        const storedUser = localStorage.getItem("SQ_STAFF_USER");
        
        loadQueueDropdowns().then(() => {
            if (storedQueue) {
                const select = document.getElementById("staffQueueSelect");
                select.value = storedQueue;
                handleStaffQueueChange();
            }
        });
        
        loadUserDropdowns().then(() => {
            if (storedUser) {
                document.getElementById("staffUserSelect").value = storedUser;
            }
        });
    } else if (tabName === 'admin') {
        title.innerText = "Administrator Console";
        subtitle.innerText = "Configure queues, register staff profiles, and monitor system metrics.";
        roleLabel.innerText = "Administrator";
        loadAdminDashboard();
    }

    // Refresh layout icons
    lucide.createIcons();

    // Immediate update
    updateActiveViewData(tabName);
}

/* ==========================================================================
   AUDIO SYNTESIZER (CHIME ALERT)
   ========================================================================== */
function initAudioToggle() {
    const audioToggleBtn = document.getElementById("audioToggleBtn");
    const volumeIcon = document.getElementById("volumeIcon");
    
    // Load setting
    const savedAudioSetting = localStorage.getItem("SQ_AUDIO_ENABLED");
    if (savedAudioSetting !== null) {
        audioEnabled = savedAudioSetting === "true";
    }
    
    updateAudioIcon();

    audioToggleBtn.addEventListener("click", () => {
        audioEnabled = !audioEnabled;
        localStorage.setItem("SQ_AUDIO_ENABLED", audioEnabled);
        updateAudioIcon();
        if (audioEnabled) {
            playChimeSound();
            showToast("Audio notifications enabled!");
        } else {
            showToast("Audio notifications muted.");
        }
    });
}

function updateAudioIcon() {
    const volumeIcon = document.getElementById("volumeIcon");
    if (audioEnabled) {
        volumeIcon.setAttribute("data-lucide", "volume-2");
    } else {
        volumeIcon.setAttribute("data-lucide", "volume-x");
    }
    lucide.createIcons();
}

function playChimeSound() {
    if (!audioEnabled) return;
    
    try {
        // Fallback to HTML5 audio element
        const chimeAudio = document.getElementById("chimeAudio");
        if (chimeAudio && chimeAudio.play) {
            chimeAudio.currentTime = 0;
            chimeAudio.play().catch(() => {
                // If browser blocks autoplay, synthesize it programmatically
                synthesizeChime();
            });
        } else {
            synthesizeChime();
        }
    } catch (e) {
        synthesizeChime();
    }
}

// Synthesize an electronic double chime using Web Audio API (100% self-contained)
function synthesizeChime() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Chime Note 1: E5
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
        gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.8);
        osc1.start(audioCtx.currentTime);
        osc1.stop(audioCtx.currentTime + 0.8);
        
        // Chime Note 2: A5
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.18); // A5
        gain2.gain.setValueAtTime(0.08, audioCtx.currentTime + 0.18);
        gain2.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.98);
        osc2.start(audioCtx.currentTime + 0.18);
        osc2.stop(audioCtx.currentTime + 0.98);
    } catch (e) {
        console.warn("Web Audio Context blocked or unavailable:", e);
    }
}

/* ==========================================================================
   DROPDOWN & DATA LOADERS
   ========================================================================== */
async function loadQueueDropdowns() {
    try {
        const response = await fetch(`${API_BASE}/queues`);
        if (!response.ok) throw new Error("Could not fetch queues");
        
        const queues = await response.json();
        updateConnectionStatus(true);
        
        // Customer Select Dropdown
        const joinSelect = document.getElementById("joinQueueSelect");
        joinSelect.innerHTML = '<option value="" disabled selected>Select service department...</option>';
        queues.forEach(q => {
            joinSelect.innerHTML += `<option value="${q.queueId}">${q.queueName}</option>`;
        });

        // Staff Select Dropdown
        const staffSelect = document.getElementById("staffQueueSelect");
        const prevValue = staffSelect.value;
        staffSelect.innerHTML = '<option value="" disabled selected>Select a queue to serve</option>';
        queues.forEach(q => {
            staffSelect.innerHTML += `<option value="${q.queueId}">${q.queueName}</option>`;
        });
        if (prevValue) staffSelect.value = prevValue;
        
    } catch (err) {
        console.error("Error loading queues:", err);
        updateConnectionStatus(false);
    }
}

async function loadUserDropdowns() {
    try {
        const staffSelect = document.getElementById("staffUserSelect");
        if (!staffSelect) return;

        // If a user is logged in as Staff or Admin, lock the profile selection to their account
        if (userSession && (userSession.role === 'Staff' || userSession.role === 'Admin')) {
            staffSelect.innerHTML = `<option value="${userSession.userId}" selected>${userSession.name} (${userSession.role})</option>`;
            staffSelect.value = userSession.userId;
            staffSelect.disabled = true;
            localStorage.setItem("SQ_STAFF_USER", userSession.userId);
            
            const staffNameDiv = document.getElementById("staffUserSelectName");
            if (staffNameDiv) {
                staffNameDiv.innerText = `${userSession.name} (${userSession.role})`;
            }
            return;
        }

        // Otherwise (e.g. no active session), load all staff users and enable selection
        staffSelect.disabled = false;
        const response = await fetch(`${API_BASE}/users`);
        if (!response.ok) throw new Error("Could not fetch users");
        
        const users = await response.json();
        updateConnectionStatus(true);

        const prevValue = staffSelect.value;
        staffSelect.innerHTML = '<option value="" disabled selected>Select staff member</option>';
        
        // Filter users to only show registered Staff/Agents and Administrators (exclude Customers)
        const serviceStaff = users.filter(u => u.role && (u.role.toLowerCase() === 'staff' || u.role.toLowerCase() === 'admin'));
        serviceStaff.forEach(u => {
            staffSelect.innerHTML += `<option value="${u.userId}">${u.name} (${u.role})</option>`;
        });
        
        if (prevValue) staffSelect.value = prevValue;
        
    } catch (err) {
        console.error("Error loading staff:", err);
        updateConnectionStatus(false);
    }
}

/* ==========================================================================
   CUSTOMER CORNER BUSINESS LOGIC
   ========================================================================== */
async function handleJoinQueue(event) {
    event.preventDefault();
    
    const queueId = document.getElementById("joinQueueSelect").value;
    const customerName = document.getElementById("customerNameInput").value.trim();
    
    if (!queueId || !customerName) {
        showToast("Please complete the form first.");
        return;
    }

    const joinBtn = document.getElementById("joinQueueBtn");
    joinBtn.disabled = true;
    joinBtn.innerText = "Issuing...";

    try {
        // Step 1: Query existing tokens and filter by current queue and today's date
        const tokensResponse = await fetch(`${API_BASE}/tokens`);
        if (!tokensResponse.ok) throw new Error("Failed to load token list");
        
        const allTokens = await tokensResponse.json();
        
        const todayStr = toLocalISOString(new Date()).split('T')[0]; // YYYY-MM-DD
        const todaysTokens = allTokens.filter(t => 
            t.queue && 
            t.queue.queueId === parseInt(queueId) && 
            t.createdAt && 
            t.createdAt.startsWith(todayStr)
        );
        
        // Find maximum token number
        let maxTokenNum = 0;
        todaysTokens.forEach(t => {
            if (t.tokenNumber && t.tokenNumber > maxTokenNum) {
                maxTokenNum = t.tokenNumber;
            }
        });
        
        const nextTokenNumber = maxTokenNum + 1;
        
        // Step 2: Create new Token via API POST (linking to user if signed in)
        const payload = {
            customerName: customerName,
            tokenNumber: nextTokenNumber,
            status: "WAITING",
            queue: {
                queueId: parseInt(queueId)
            }
        };
        if (userSession) {
            payload.user = { userId: userSession.userId };
        }

        const createResponse = await fetch(`${API_BASE}/tokens`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!createResponse.ok) throw new Error("Failed to issue new ticket");
        
        const newTicket = await createResponse.json();
        
        // Step 3: Save generated ticket ID to Local Storage
        localStorage.setItem("SQ_CUSTOMER_TICKET", JSON.stringify(newTicket));
        localStorage.setItem(`SQ_TOKEN_CREATED_${newTicket.tokenId}`, new Date().toISOString());
        showToast("Ticket Issued Successfully!");
        
        // Clear input form
        document.getElementById("customerNameInput").value = "";
        
        // Refresh View
        loadCustomerTicket();
        
    } catch (err) {
        console.error("Error issuing ticket:", err);
        showToast("Error: " + err.message);
    } finally {
        joinBtn.disabled = false;
        joinBtn.innerHTML = `<span>Issue Token Ticket</span><i data-lucide="arrow-right"></i>`;
        lucide.createIcons();
    }
}

// Text to Speech voice calling assistant
function speakAnnouncement(text) {
    if (!audioEnabled) return;
    try {
        if ('speechSynthesis' in window) {
            // Cancel any current speaking
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1.05;
            window.speechSynthesis.speak(utterance);
        }
    } catch (e) {
        console.warn("Speech synthesis error:", e);
    }
}

function toggleCustomerLayout(hasActiveTicket) {
    const container = document.getElementById("customer-view-container");
    const joinCard = document.getElementById("join-queue-card");
    const ticketCard = document.getElementById("active-ticket-card");

    if (!container || !joinCard || !ticketCard) return;

    if (hasActiveTicket) {
        joinCard.classList.add("hidden");
        ticketCard.classList.remove("hidden");
        container.classList.add("single-card-view");
    } else {
        joinCard.classList.remove("hidden");
        ticketCard.classList.add("hidden");
        container.classList.remove("single-card-view");
    }
}

function createNewTicketFlow() {
    localStorage.removeItem("SQ_CUSTOMER_TICKET");
    loadCustomerTicket();
    showToast("Ready to issue a new token!");
}

async function loadCustomerTicket() {
    const ticketDataStr = localStorage.getItem("SQ_CUSTOMER_TICKET");
    
    if (!ticketDataStr) {
        // No ticket issued
        toggleCustomerLayout(false);
        document.getElementById("no-ticket-state").classList.remove("hidden");
        document.getElementById("ticket-state").classList.add("hidden");
        return;
    }

    const cachedTicket = JSON.parse(ticketDataStr);
    
    try {
        // Fetch fresh state from backend to see if it was called or completed
        const response = await fetch(`${API_BASE}/tokens/${cachedTicket.tokenId}`);
        if (response.status === 404 || !response.ok) {
            // Ticket cancelled or deleted in DB
            localStorage.removeItem("SQ_CUSTOMER_TICKET");
            toggleCustomerLayout(false);
            document.getElementById("no-ticket-state").classList.remove("hidden");
            document.getElementById("ticket-state").classList.add("hidden");
            return;
        }

        const freshTicket = await response.json();

        if (freshTicket.status === 'COMPLETED' || freshTicket.status === 'SKIPPED') {
            const message = freshTicket.status === 'COMPLETED' ? 
                "Your ticket has been marked Completed!" : 
                "Your ticket was skipped (no-show).";
            showToast(message);
            localStorage.removeItem("SQ_CUSTOMER_TICKET");
            toggleCustomerLayout(false);
            document.getElementById("no-ticket-state").classList.remove("hidden");
            document.getElementById("ticket-state").classList.add("hidden");
            return;
        }

        // Show ticket layout
        toggleCustomerLayout(true);
        document.getElementById("no-ticket-state").classList.add("hidden");
        document.getElementById("ticket-state").classList.remove("hidden");

        // Update elements
        document.getElementById("ticketQueueName").innerText = freshTicket.queue ? freshTicket.queue.queueName : "Service Department";
        document.getElementById("ticketNumber").innerText = formatTokenNumber(freshTicket.tokenNumber);
        document.getElementById("ticketHolderName").innerText = freshTicket.customerName;
        
        // Status Badge Style
        const statusBadge = document.getElementById("ticketStatus");
        statusBadge.innerText = freshTicket.status;
        statusBadge.className = "ticket-badge"; // reset
        if (freshTicket.status === 'SERVING') {
            statusBadge.classList.add("serving");
            
            // Check if status changed to serving, make sound chime!
            if (cachedTicket.status !== 'SERVING') {
                playChimeSound();
                showToast("It's your turn! Please proceed to the service counter.");
                const speechMsg = `Token number ${freshTicket.tokenNumber}, please proceed to the service desk.`;
                speakAnnouncement(speechMsg);
            }
        }
        
        // Save fresh ticket state
        localStorage.setItem("SQ_CUSTOMER_TICKET", JSON.stringify(freshTicket));

        // Estimate wait times
        // Fetch all tokens and filter for this queue to count how many are ahead
        const qResponse = await fetch(`${API_BASE}/tokens`);
        if (qResponse.ok) {
            const allTokensList = await qResponse.json();
            const allQueueTokens = allTokensList.filter(t => t.queue && t.queue.queueId === freshTicket.queue.queueId);
            
            // Filter waiting tokens that have a smaller number than ours
            const waitingAhead = allQueueTokens.filter(t => 
                t.status === 'WAITING' && 
                t.tokenNumber < freshTicket.tokenNumber
            );
            
            const aheadCount = waitingAhead.length;
            document.getElementById("ticketWaitCount").innerText = aheadCount;
            
            // 3 mins per person estimate
            if (freshTicket.status === 'SERVING') {
                document.getElementById("ticketWaitTime").innerText = "Now Serving";
            } else if (aheadCount === 0) {
                document.getElementById("ticketWaitTime").innerText = "~ 2-3 mins";
            } else {
                document.getElementById("ticketWaitTime").innerText = `~ ${aheadCount * 3} mins`;
            }

            // Trigger notification when the token is near (estimated wait time: ~1 min, i.e., 0 or 1 persons ahead)
            if (freshTicket.status === 'WAITING' && aheadCount <= 1) {
                const notifKey = `SQ_NEAR_NOTIF_SENT_${freshTicket.tokenId}`;
                if (!localStorage.getItem(notifKey)) {
                    localStorage.setItem(notifKey, "true");
                    
                    const queueName = freshTicket.queue ? freshTicket.queue.queueName : "Service Counter";
                    const speechText = `Token number ${freshTicket.tokenNumber}. Your turn is approaching at the ${queueName}. Please proceed near the counter.`;
                    speakAnnouncement(speechText);
                    showToast("Proximity alert: Your turn is approaching!");

                    const notifPayload = {
                        message: `Token ${formatTokenNumber(freshTicket.tokenNumber)} (${freshTicket.customerName}) is near the counter at ${queueName}. Estimated wait: ~1 min.`,
                        sentTime: toLocalISOString()
                    };
                    if (freshTicket.user) {
                        notifPayload.user = { userId: freshTicket.user.userId };
                    } else if (userSession) {
                        notifPayload.user = { userId: userSession.userId };
                    }

                    fetch(`${API_BASE}/notifications`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(notifPayload)
                    }).catch(e => console.error("Error creating notification DB entry:", e));
                }
            }
        }

    } catch (err) {
        console.error("Error syncing customer ticket:", err);
        // Fallback to cached token data display if offline
        toggleCustomerLayout(true);
        document.getElementById("no-ticket-state").classList.add("hidden");
        document.getElementById("ticket-state").classList.remove("hidden");
        document.getElementById("ticketQueueName").innerText = cachedTicket.queue ? cachedTicket.queue.queueName : "Service Dept";
        document.getElementById("ticketNumber").innerText = formatTokenNumber(cachedTicket.tokenNumber);
        document.getElementById("ticketHolderName").innerText = cachedTicket.customerName;
        document.getElementById("ticketStatus").innerText = cachedTicket.status;
        document.getElementById("ticketWaitTime").innerText = "Offline Mode";
        document.getElementById("ticketWaitCount").innerText = "?";
    }
}

async function handleCancelTicket() {
    const ticketDataStr = localStorage.getItem("SQ_CUSTOMER_TICKET");
    if (!ticketDataStr) return;
    
    const ticket = JSON.parse(ticketDataStr);
    
    if (!confirm("Are you sure you want to cancel your queue ticket?")) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/tokens/${ticket.tokenId}`, {
            method: 'DELETE'
        });
        
        if (response.ok || response.status === 404) {
            localStorage.removeItem("SQ_CUSTOMER_TICKET");
            showToast("Ticket cancelled.");
            loadCustomerTicket();
        } else {
            throw new Error("Unable to delete ticket");
        }
    } catch (err) {
        showToast("Error: " + err.message);
    }
}

function printTicket() {
    window.print();
}

/* ==========================================================================
   SERVICE DESK (STAFF CONTROL) BUSINESS LOGIC
   ========================================================================== */
function handleStaffQueueChange() {
    const queueId = document.getElementById("staffQueueSelect").value;
    if (!queueId) return;

    // Persist selection
    localStorage.setItem("SQ_STAFF_QUEUE", queueId);

    // Refresh desk data
    refreshStaffDeskData(queueId);
}

// Keep track of serving token in staff memory
let currentlyServingToken = null;

async function refreshStaffDeskData(queueId) {
    if (!queueId) return;

    try {
        // Fetch all tokens and filter by queueId
        const response = await fetch(`${API_BASE}/tokens`);
        if (!response.ok) throw new Error("Unable to fetch tokens");

        const allTokens = await response.json();
        const tokens = allTokens.filter(t => t.queue && t.queue.queueId === parseInt(queueId));
        updateConnectionStatus(true);

        // Filter and update backlog metrics
        const waitingTokens = tokens.filter(t => t.status === 'WAITING').sort((a, b) => a.tokenNumber - b.tokenNumber);
        const servingTokens = tokens.filter(t => t.status === 'SERVING');
        
        document.getElementById("staffQueueWaitingCount").innerText = waitingTokens.length;
        document.getElementById("backlogCountBadge").innerText = `${waitingTokens.length} Waiting`;

        // Update active serving display
        const activeDeskToken = servingTokens.length > 0 ? servingTokens[0] : null;
        currentlyServingToken = activeDeskToken;

        const monitorNum = document.getElementById("servingTokenNumber");
        const monitorCustName = document.getElementById("servingCustomerName");
        const completeBtn = document.getElementById("completeTokenBtn");
        const recallBtn = document.getElementById("recallBtn");
        const skipBtn = document.getElementById("skipTokenBtn");

        if (activeDeskToken) {
            monitorNum.innerText = formatTokenNumber(activeDeskToken.tokenNumber);
            monitorCustName.innerText = activeDeskToken.customerName;
            completeBtn.disabled = false;
            recallBtn.disabled = false;
            if (skipBtn) skipBtn.disabled = false;
            
            document.getElementById("staffQueueCurrentTokenVal").innerText = activeDeskToken.tokenNumber;
        } else {
            monitorNum.innerText = "--";
            monitorCustName.innerText = "No Active Customer";
            completeBtn.disabled = true;
            recallBtn.disabled = true;
            if (skipBtn) skipBtn.disabled = true;
            document.getElementById("staffQueueCurrentTokenVal").innerText = "0";
        }

        // Render backlog table rows
        const tableBody = document.getElementById("waitingTokensTableBody");
        tableBody.innerHTML = "";

        if (tokens.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No tickets generated yet for this department.</td></tr>`;
            return;
        }

        // Sort tokens so Serving are first, then Waiting, then others
        const sortedTokens = [...tokens].sort((a, b) => {
            const statusWeight = { 'SERVING': 1, 'WAITING': 2, 'COMPLETED': 3 };
            const weightA = statusWeight[a.status] || 99;
            const weightB = statusWeight[b.status] || 99;
            if (weightA !== weightB) return weightA - weightB;
            return a.tokenNumber - b.tokenNumber;
        });

        sortedTokens.forEach(t => {
            let statusClass = "badge-primary";
            if (t.status === 'SERVING') statusClass = "badge-success";
            else if (t.status === 'COMPLETED') statusClass = "badge-secondary";
            else if (t.status === 'CANCELLED') statusClass = "badge-danger";
            else if (t.status === 'SKIPPED') statusClass = "badge-warning";

            const agentName = t.user ? t.user.name : "Unassigned Desk";
            const isInactive = t.status === 'COMPLETED' || t.status === 'SKIPPED' || t.status === 'CANCELLED';

            const actionButtons = isInactive ? '-' : `
                <div style="display:flex; gap: 8px;">
                    ${t.status === 'WAITING' ? `
                        <button class="btn btn-secondary" style="padding: 4px 8px; font-size:12px;" onclick="callSpecificToken(${t.tokenId})">Call</button>
                    ` : ''}
                    ${t.status === 'SERVING' ? `
                        <button class="btn btn-success" style="padding: 4px 8px; font-size:12px;" onclick="handleCompleteServingToken()">Complete</button>
                    ` : ''}
                    <button class="btn btn-danger" style="padding: 4px 8px; font-size:12px; background-color: var(--danger);" onclick="deleteTokenFromStaff(${t.tokenId})">Cancel</button>
                </div>
            `;

            tableBody.innerHTML += `
                <tr>
                    <td style="font-weight: 700;">${formatTokenNumber(t.tokenNumber)}</td>
                    <td>${t.customerName}</td>
                    <td><span class="badge ${statusClass}">${t.status}</span></td>
                    <td>${agentName}</td>
                    <td>${actionButtons}</td>
                </tr>
            `;
        });

    } catch (err) {
        console.error("Error refreshing staff desk:", err);
        updateConnectionStatus(false);
    }
}

async function handleCallNextToken() {
    const queueId = document.getElementById("staffQueueSelect").value;
    const userId = document.getElementById("staffUserSelect").value;
    
    if (!queueId) {
        showToast("Please assign a service queue to this desk first.");
        return;
    }

    // Persist staff ID
    if (userId) {
        localStorage.setItem("SQ_STAFF_USER", userId);
    }

    const callBtn = document.getElementById("callNextBtn");
    callBtn.disabled = true;

    try {
        // Backend handles selecting the first waiting token, sets to SERVING and returns it
        const response = await fetch(`${API_BASE}/tokens/next/${queueId}`, {
            method: 'PUT'
        });

        if (response.status === 204 || response.status === 404) {
            showToast("No customers waiting in this queue.");
            return;
        }

        const dataText = await response.text();
        if (!dataText) {
            showToast("No customers waiting in this queue.");
            return;
        }

        const nextToken = JSON.parse(dataText);
        localStorage.setItem(`SQ_TOKEN_START_${nextToken.tokenId}`, new Date().toISOString());
        
        // If an agent is logged in, assign the user token relation (optional backend link)
        if (userId && nextToken.tokenId) {
            // Assign the user agent to the token status
            await fetch(`${API_BASE}/tokens/${nextToken.tokenId}/status?status=SERVING`, {
                method: 'PUT'
            });
            // Update token object with user object link
            nextToken.user = { userId: parseInt(userId) };
            await fetch(`${API_BASE}/tokens`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nextToken)
            });
        }

        showToast(`Calling Token: ${formatTokenNumber(nextToken.tokenNumber)}`);
        
        // Announce token with speech
        const queueSelect = document.getElementById("staffQueueSelect");
        const queueName = queueSelect.options[queueSelect.selectedIndex].text;
        const speechMsg = `Calling token number ${nextToken.tokenNumber}. Please proceed to ${queueName}.`;
        speakAnnouncement(speechMsg);

        playChimeSound();
        refreshStaffDeskData(queueId);

    } catch (err) {
        console.error("Error calling next customer:", err);
        showToast("Call Next failed: " + err.message);
    } finally {
        callBtn.disabled = false;
    }
}

async function callSpecificToken(tokenId) {
    const queueId = document.getElementById("staffQueueSelect").value;
    const userId = document.getElementById("staffUserSelect").value;
    
    try {
        // Get token
        const res = await fetch(`${API_BASE}/tokens/${tokenId}`);
        if (!res.ok) throw new Error("Could not find token details");
        const token = await res.json();
        
        // Update to SERVING
        token.status = "SERVING";
        if (userId) {
            token.user = { userId: parseInt(userId) };
        }
        
        const saveRes = await fetch(`${API_BASE}/tokens`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(token)
        });

        if (!saveRes.ok) throw new Error("Failed to assign service counter");
        
        localStorage.setItem(`SQ_TOKEN_START_${tokenId}`, new Date().toISOString());
        showToast(`Calling Token: ${formatTokenNumber(token.tokenNumber)}`);
        
        // Announce token with speech
        const queueSelect = document.getElementById("staffQueueSelect");
        const queueName = queueSelect.options[queueSelect.selectedIndex].text;
        const speechMsg = `Calling token number ${token.tokenNumber}. Please proceed to ${queueName}.`;
        speakAnnouncement(speechMsg);

        playChimeSound();
        refreshStaffDeskData(queueId);
        
    } catch (err) {
        showToast("Error calling token: " + err.message);
    }
}

async function handleCompleteServingToken() {
    if (!currentlyServingToken) return;
    
    const queueId = document.getElementById("staffQueueSelect").value;
    const completeBtn = document.getElementById("completeTokenBtn");
    completeBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/tokens/complete/${currentlyServingToken.tokenId}`, {
            method: 'PUT'
        });

        if (!response.ok) throw new Error("Unable to complete token state");

        // Save Completed Session to Service History
        try {
            const tokenId = currentlyServingToken.tokenId;
            const now = new Date();
            const endTimeStr = toLocalISOString(now); // YYYY-MM-DDTHH:MM:SS (local IST)
            
            let startTimeStr = localStorage.getItem(`SQ_TOKEN_START_${tokenId}`);
            if (!startTimeStr) {
                // Default to 5 minutes ago
                startTimeStr = toLocalISOString(new Date(now.getTime() - 5 * 60 * 1000));
            } else {
                startTimeStr = toLocalISOString(new Date(startTimeStr));
            }

            let createdTimeStr = localStorage.getItem(`SQ_TOKEN_CREATED_${tokenId}`);
            if (!createdTimeStr) {
                // Default to 15 minutes ago
                const parsedStart = parseLocalDateTime(startTimeStr) || now;
                createdTimeStr = toLocalISOString(new Date(parsedStart.getTime() - 10 * 60 * 1000));
            } else {
                createdTimeStr = toLocalISOString(new Date(createdTimeStr));
            }

            const startTimeMs = parseLocalDateTime(startTimeStr).getTime();
            const endTimeMs = parseLocalDateTime(endTimeStr).getTime();
            const createdTimeMs = parseLocalDateTime(createdTimeStr).getTime();

            // Calculate differences in minutes (minimum 1)
            const waitingTime = Math.max(1, Math.round((startTimeMs - createdTimeMs) / 60000));
            const serviceDuration = Math.max(1, Math.round((endTimeMs - startTimeMs) / 60000));

            const serviceHistoryPayload = {
                token: { tokenId: tokenId },
                startTime: startTimeStr,
                endTime: endTimeStr,
                waitingTime: waitingTime,
                serviceDuration: serviceDuration
            };

            await fetch(`${API_BASE}/service-history`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(serviceHistoryPayload)
            });

            // Cleanup local storage
            localStorage.removeItem(`SQ_TOKEN_START_${tokenId}`);
            localStorage.removeItem(`SQ_TOKEN_CREATED_${tokenId}`);
            localStorage.removeItem(`SQ_NEAR_NOTIF_SENT_${tokenId}`);
        } catch (historyErr) {
            console.error("Failed to post completed ticket to ServiceHistory database:", historyErr);
        }

        showToast(`Token ${formatTokenNumber(currentlyServingToken.tokenNumber)} Completed.`);
        refreshStaffDeskData(queueId);

    } catch (err) {
        console.error("Error completing ticket:", err);
        showToast("Error completing ticket: " + err.message);
    } finally {
        completeBtn.disabled = false;
    }
}

function handleRecallToken() {
    if (!currentlyServingToken) return;
    
    // Play announcement voice message
    const queueSelect = document.getElementById("staffQueueSelect");
    const queueName = queueSelect ? queueSelect.options[queueSelect.selectedIndex].text : "Service Counter";
    const speechMsg = `Calling token number ${currentlyServingToken.tokenNumber}. Please proceed to ${queueName}.`;
    speakAnnouncement(speechMsg);

    playChimeSound();
    showToast(`Re-announcing Token ${formatTokenNumber(currentlyServingToken.tokenNumber)}`);
}

async function handleSkipServingToken() {
    if (!currentlyServingToken) return;
    
    const queueId = document.getElementById("staffQueueSelect").value;
    const skipBtn = document.getElementById("skipTokenBtn");
    if (skipBtn) skipBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/tokens/${currentlyServingToken.tokenId}/status?status=SKIPPED`, {
            method: 'PUT'
        });

        if (!response.ok) throw new Error("Unable to update token state to SKIPPED");

        // Clean up local storage items for this token
        const tokenId = currentlyServingToken.tokenId;
        localStorage.removeItem(`SQ_TOKEN_START_${tokenId}`);
        localStorage.removeItem(`SQ_TOKEN_CREATED_${tokenId}`);
        localStorage.removeItem(`SQ_NEAR_NOTIF_SENT_${tokenId}`);

        showToast(`Token ${formatTokenNumber(currentlyServingToken.tokenNumber)} skipped.`);
        refreshStaffDeskData(queueId);

    } catch (err) {
        console.error("Error skipping ticket:", err);
        showToast("Error skipping ticket: " + err.message);
    } finally {
        if (skipBtn) skipBtn.disabled = false;
    }
}

async function deleteTokenFromStaff(tokenId) {
    if (!confirm("Are you sure you want to cancel/remove this token?")) return;
    
    const queueId = document.getElementById("staffQueueSelect").value;
    
    try {
        const response = await fetch(`${API_BASE}/tokens/${tokenId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast("Token deleted successfully.");
            refreshStaffDeskData(queueId);
        } else {
            throw new Error("API responded with error");
        }
    } catch (err) {
        showToast("Failed to delete token: " + err.message);
    }
}

let adminUsersList = [];
let currentAdminUserFilter = 'staff';

function filterRegisteredUsers(filterType) {
    currentAdminUserFilter = filterType;
    
    const btnStaff = document.getElementById("userFilterStaff");
    const btnCustomer = document.getElementById("userFilterCustomer");
    if (btnStaff && btnCustomer) {
        if (filterType === 'staff') {
            btnStaff.classList.add("active-filter");
            btnCustomer.classList.remove("active-filter");
        } else {
            btnStaff.classList.remove("active-filter");
            btnCustomer.classList.add("active-filter");
        }
    }
    
    renderAdminUsersTable();
}

function renderAdminUsersTable() {
    const uTableBody = document.getElementById("adminUsersTableBody");
    if (!uTableBody) return;
    
    uTableBody.innerHTML = "";
    
    const filteredUsers = adminUsersList.filter(u => {
        if (currentAdminUserFilter === 'staff') {
            return u.role && (u.role.toLowerCase() === 'staff' || u.role.toLowerCase() === 'admin');
        } else {
            return u.role && u.role.toLowerCase() === 'customer';
        }
    });
    
    if (filteredUsers.length === 0) {
        uTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No registered users in this category.</td></tr>`;
        return;
    }
    
    filteredUsers.forEach(u => {
        let badgeClass = "badge-primary";
        if (u.role === 'Admin') badgeClass = "badge-success";
        else if (u.role === 'Customer') badgeClass = "badge-secondary";

        uTableBody.innerHTML += `
            <tr>
                <td style="font-weight:600;">#${u.userId}</td>
                <td>${u.name}</td>
                <td>${u.email}</td>
                <td>${u.phone || '-'}</td>
                <td><span class="badge ${badgeClass}">${u.role}</span></td>
            </tr>
        `;
    });
}

/* ==========================================================================
   ADMIN CONSOLE BUSINESS LOGIC
   ========================================================================== */
async function loadAdminDashboard() {
    try {
        // Fetch Queues
        const qRes = await fetch(`${API_BASE}/queues`);
        const queues = qRes.ok ? await qRes.json() : [];

        // Fetch Users
        const uRes = await fetch(`${API_BASE}/users`);
        const users = uRes.ok ? await uRes.json() : [];

        // Fetch Tokens
        const tRes = await fetch(`${API_BASE}/tokens`);
        const tokens = tRes.ok ? await tRes.json() : [];

        updateConnectionStatus(true);

        // Update stats
        document.getElementById("statTotalQueues").innerText = queues.length;
        document.getElementById("statTotalTokens").innerText = tokens.length;
        
        const waitingCount = tokens.filter(t => t.status === 'WAITING').length;
        const servingCount = tokens.filter(t => t.status === 'SERVING').length;
        const completedCount = tokens.filter(t => t.status === 'COMPLETED').length;
        const skippedCount = tokens.filter(t => t.status === 'SKIPPED').length;

        document.getElementById("statWaitingTokens").innerText = waitingCount;
        document.getElementById("statServingTokens").innerText = servingCount;
        document.getElementById("statCompletedTokens").innerText = completedCount;
        const statSkippedEl = document.getElementById("statSkippedTokens");
        if (statSkippedEl) statSkippedEl.innerText = skippedCount;

        // Render Admin Queues table
        const qTableBody = document.getElementById("adminQueuesTableBody");
        qTableBody.innerHTML = "";
        
        if (queues.length === 0) {
            qTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No queues registered yet.</td></tr>`;
        } else {
            queues.forEach(q => {
                // Count tokens matching this queue
                const queueTokens = tokens.filter(t => t.queue && t.queue.queueId === q.queueId);
                const activeTokenObj = queueTokens.find(t => t.status === 'SERVING');
                const activeTokenStr = activeTokenObj ? formatTokenNumber(activeTokenObj.tokenNumber) : 'None';

                qTableBody.innerHTML += `
                    <tr>
                        <td style="font-weight:600;">#${q.queueId}</td>
                        <td>${q.queueName}</td>
                        <td><span class="badge ${activeTokenObj ? 'badge-success' : 'badge-primary'}">${activeTokenStr}</span></td>
                        <td>${queueTokens.length} tickets</td>
                    </tr>
                `;
            });
        }

        // Render Admin Users table using filter
        adminUsersList = users;
        renderAdminUsersTable();

        // Render Skipped Tokens table
        const skippedTableBody = document.getElementById("skippedTokensTableBody");
        if (skippedTableBody) {
            skippedTableBody.innerHTML = "";
            const skippedTokens = tokens.filter(t => t.status === 'SKIPPED');
            if (skippedTokens.length === 0) {
                skippedTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No skipped tokens found.</td></tr>`;
            } else {
                skippedTokens.forEach(t => {
                    const queueName = t.queue ? t.queue.queueName : "General";
                    const staffName = t.user ? t.user.name : "Unassigned Desk";
                    skippedTableBody.innerHTML += `
                        <tr>
                            <td style="font-weight: 700;">${formatTokenNumber(t.tokenNumber)}</td>
                            <td>${t.customerName}</td>
                            <td><span class="badge badge-warning">${queueName}</span></td>
                            <td>${staffName}</td>
                            <td>
                                <div style="display:flex; gap: 8px;">
                                    <button class="btn btn-secondary" style="padding: 4px 8px; font-size:12px;" onclick="requeueToken(${t.tokenId})">Re-queue</button>
                                    <button class="btn btn-danger" style="padding: 4px 8px; font-size:12px; background-color: var(--danger);" onclick="deleteSkippedToken(${t.tokenId})">Delete</button>
                                </div>
                            </td>
                        </tr>
                    `;
                });
            }
        }

        // Auto load notifications and completed service histories
        loadNotifications();
        loadServiceHistory();
        updateAnalyticsCharts();

    } catch (err) {
        console.error("Error loading admin dashboard details:", err);
        updateConnectionStatus(false);
    }
}

async function requeueToken(tokenId) {
    try {
        const response = await fetch(`${API_BASE}/tokens/${tokenId}/status?status=WAITING`, {
            method: 'PUT'
        });
        if (!response.ok) throw new Error("Could not re-queue token");
        showToast("Token re-queued successfully.");
        loadAdminDashboard();
    } catch (err) {
        showToast("Failed to re-queue: " + err.message);
    }
}

async function deleteSkippedToken(tokenId) {
    if (!confirm("Are you sure you want to permanently delete this skipped token?")) return;
    try {
        const response = await fetch(`${API_BASE}/tokens/${tokenId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error("Could not delete token");
        showToast("Skipped token deleted.");
        loadAdminDashboard();
    } catch (err) {
        showToast("Failed to delete token: " + err.message);
    }
}

async function handleCreateQueue(event) {
    event.preventDefault();
    const queueName = document.getElementById("newQueueNameInput").value.trim();
    if (!queueName) return;

    const createBtn = document.getElementById("createQueueBtn");
    createBtn.disabled = true;

    try {
        const payload = {
            queueName: queueName,
            currentToken: 0
        };

        const response = await fetch(`${API_BASE}/queues`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Could not create queue");

        showToast(`Queue "${queueName}" Created Successfully!`);
        document.getElementById("newQueueNameInput").value = "";
        loadAdminDashboard();
        
    } catch (err) {
        showToast("Error creating queue: " + err.message);
    } finally {
        createBtn.disabled = false;
    }
}

async function handleCreateUser(event) {
    event.preventDefault();
    
    const name = document.getElementById("newUserNameInput").value.trim();
    const email = document.getElementById("newUserEmailInput").value.trim();
    const phone = document.getElementById("newUserPhoneInput").value.trim();
    const password = document.getElementById("newUserPasswordInput").value.trim();
    const role = document.getElementById("newUserRoleSelect").value;

    if (role === 'Admin' && email.toLowerCase() !== 'admin@smartqueue.com') {
        showToast("Registration Denied: Cannot register additional administrators.");
        return;
    }

    const createBtn = document.getElementById("createUserBtn");
    createBtn.disabled = true;

    try {
        const payload = { name, email, phone, password, role };

        const response = await fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Failed to register agent");

        showToast(`Agent profile registered: ${name}`);
        
        // Reset fields
        document.getElementById("newUserNameInput").value = "";
        document.getElementById("newUserEmailInput").value = "";
        document.getElementById("newUserPhoneInput").value = "";
        document.getElementById("newUserPasswordInput").value = "";
        
        loadAdminDashboard();
        
    } catch (err) {
        showToast("Registration failed: " + err.message);
    } finally {
        createBtn.disabled = false;
    }
}

/* ==========================================================================
   LIVE SYNC AND GENERAL UTILITIES
   ========================================================================== */
function startAutoRefresh() {
    if (refreshIntervalId) clearInterval(refreshIntervalId);

    refreshIntervalId = setInterval(() => {
        const autoRefreshChecked = document.getElementById("autoRefreshToggle").checked;
        if (!autoRefreshChecked) return;

        // Determine which view is currently active, and run sync for that view
        const activeView = document.querySelector(".dashboard-view.active");
        if (!activeView) return;

        const viewId = activeView.id;
        updateActiveViewData(viewId.replace("view-", ""));

    }, 10000); // Sync every 10 seconds to optimize connection limits
}

function updateActiveViewData(tabName) {
    if (tabName === 'customer') {
        loadCustomerTicket();
    } else if (tabName === 'staff') {
        const queueId = document.getElementById("staffQueueSelect").value;
        if (queueId) refreshStaffDeskData(queueId);
    } else if (tabName === 'admin') {
        loadAdminDashboard();
    }
}

function updateConnectionStatus(isConnected) {
    const statusDiv = document.getElementById("connectionStatus");
    const statusText = statusDiv.querySelector(".status-text");
    
    if (isConnected) {
        statusDiv.className = "connection-status connected";
        statusText.innerText = "Connected to Server";
    } else {
        statusDiv.className = "connection-status";
        statusText.innerText = "Offline: API Unreachable";
    }
}

// Pad token numbers for neat ticket serial view (e.g. 7 -> "07")
function formatTokenNumber(num) {
    if (!num) return "00";
    return num < 10 ? `0${num}` : num.toString();
}

// Fade-in Toast Notification Trigger
function showToast(message) {
    const toast = document.getElementById("toast");
    const msgSpan = document.getElementById("toastMessage");
    
    msgSpan.innerText = message;
    toast.classList.add("show");
    
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}
function toLocalISOString(date) {
    if (!date) date = new Date();
    const tzoffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzoffset).toISOString();
    return localISOTime.split('.')[0]; // YYYY-MM-DDTHH:mm:ss
}

function parseLocalDateTime(str) {
    if (!str) return null;
    const parts = str.split('T');
    if (parts.length !== 2) return new Date(str);
    const dateParts = parts[0].split('-');
    const timeParts = parts[1].split(':');
    if (dateParts.length !== 3 || timeParts.length < 2) return new Date(str);
    
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const day = parseInt(dateParts[2], 10);
    const hour = parseInt(timeParts[0], 10);
    const minute = parseInt(timeParts[1], 10);
    const second = timeParts[2] ? parseInt(timeParts[2].split('.')[0], 10) : 0;
    
    return new Date(year, month, day, hour, minute, second);
}

function formatDateTime(isoString) {
    if (!isoString) return "-";
    try {
        const date = parseLocalDateTime(isoString);
        if (!date || isNaN(date.getTime())) {
            return isoString;
        }
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + 
               " " + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
        return isoString;
    }
}

let notificationList = [];
let allQueuesList = [];
let allTokensList = [];

async function loadNotifications() {
    try {
        const response = await fetch(`${API_BASE}/notifications`);
        if (!response.ok) throw new Error("Could not fetch notifications");
        notificationList = await response.json();
        
        const qRes = await fetch(`${API_BASE}/queues`);
        allQueuesList = qRes.ok ? await qRes.json() : [];

        const tRes = await fetch(`${API_BASE}/tokens`);
        allTokensList = tRes.ok ? await tRes.json() : [];
        
        populateNotificationFilters();
        renderNotificationsTable();
    } catch (err) {
        console.error("Error loading notifications table:", err);
    }
}

function populateNotificationFilters() {
    const filterSelect = document.getElementById("notificationCategoryFilter");
    if (!filterSelect) return;
    
    const prevSelection = filterSelect.value;
    filterSelect.innerHTML = '<option value="All">All Facilities</option>';
    filterSelect.innerHTML += '<option value="System">General / System Alerts</option>';
    
    allQueuesList.forEach(q => {
        filterSelect.innerHTML += `<option value="${q.queueName}">${q.queueName}</option>`;
    });
    
    if (prevSelection && [...filterSelect.options].some(opt => opt.value === prevSelection)) {
        filterSelect.value = prevSelection;
    }
}

function filterNotifications() {
    renderNotificationsTable();
}

function renderNotificationsTable() {
    const tableBody = document.getElementById("notificationTableBody");
    const filterVal = document.getElementById("notificationCategoryFilter")?.value || 'All';
    if (!tableBody) return;
    
    tableBody.innerHTML = "";
    
    if (notificationList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No notifications sent yet.</td></tr>`;
        return;
    }
    
    const sortedNotifications = [...notificationList].sort((a, b) => new Date(b.sentTime) - new Date(a.sentTime));
    
    const filteredNotifications = sortedNotifications.filter(notification => {
        if (filterVal === 'All') return true;
        
        let deducedCategory = "System";
        
        // Parse token number and customer name from message to resolve the matching token and queue
        const match = notification.message.match(/Token\s+(\d+)\s*\(?([^)]+)?\)?/i);
        if (match) {
            const tokenNum = parseInt(match[1]);
            let custName = match[2] ? match[2].trim() : "";
            if (custName.includes(")")) {
                custName = custName.split(")")[0].trim();
            }
            
            const matchedToken = allTokensList.find(tk => {
                const sameUser = notification.user && tk.user && tk.user.userId === notification.user.userId;
                const sameTokenNum = tk.tokenNumber === tokenNum;
                const sameName = !custName || (tk.customerName && tk.customerName.toLowerCase() === custName.toLowerCase());
                return sameTokenNum && sameUser && sameName;
            });
            
            const fallbackToken = matchedToken || allTokensList.find(tk => 
                tk.tokenNumber === tokenNum && 
                notification.user && 
                tk.user && 
                tk.user.userId === notification.user.userId
            );
            
            if (fallbackToken && fallbackToken.queue) {
                deducedCategory = fallbackToken.queue.queueName;
            }
        } else {
            // Check if queue name is directly in message
            allQueuesList.forEach(q => {
                if (notification.message.includes(q.queueName)) {
                    deducedCategory = q.queueName;
                }
            });
        }
        
        if (filterVal === 'System') {
            return deducedCategory === 'System';
        }
        
        return deducedCategory === filterVal;
    });
    
    if (filteredNotifications.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No notifications for this facility.</td></tr>`;
        return;
    }
    
    filteredNotifications.forEach(notification => {
        const timeStr = formatDateTime(notification.sentTime);
        const userStr = notification.user ? `${notification.user.name} (${notification.user.role})` : "Broadcast / Guest";
        
        let categoryLabel = "General / System";
        let badgeClass = "badge-primary";
        
        const match = notification.message.match(/Token\s+(\d+)\s*\(?([^)]+)?\)?/i);
        if (match) {
            const tokenNum = parseInt(match[1]);
            let custName = match[2] ? match[2].trim() : "";
            if (custName.includes(")")) {
                custName = custName.split(")")[0].trim();
            }
            
            const matchedToken = allTokensList.find(tk => {
                const sameUser = notification.user && tk.user && tk.user.userId === notification.user.userId;
                const sameTokenNum = tk.tokenNumber === tokenNum;
                const sameName = !custName || (tk.customerName && tk.customerName.toLowerCase() === custName.toLowerCase());
                return sameTokenNum && sameUser && sameName;
            });
            
            const fallbackToken = matchedToken || allTokensList.find(tk => 
                tk.tokenNumber === tokenNum && 
                notification.user && 
                tk.user && 
                tk.user.userId === notification.user.userId
            );
            
            if (fallbackToken && fallbackToken.queue) {
                categoryLabel = fallbackToken.queue.queueName;
                badgeClass = "badge-success";
            }
        } else {
            allQueuesList.forEach(q => {
                if (notification.message.includes(q.queueName)) {
                    categoryLabel = q.queueName;
                    badgeClass = "badge-success";
                }
            });
        }
        
        tableBody.innerHTML += `
            <tr>
                <td style="font-weight:600; white-space:nowrap;">${timeStr}</td>
                <td style="white-space:nowrap;">${userStr}</td>
                <td>${notification.message}</td>
                <td><span class="badge ${badgeClass}">${categoryLabel}</span></td>
            </tr>
        `;
    });
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function formatLocalDate(isoString) {
    if (!isoString) return "Unknown Date";
    try {
        const date = parseLocalDateTime(isoString);
        if (!date || isNaN(date.getTime())) {
            return "Unknown Date";
        }
        return date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
        return "Unknown Date";
    }
}

let serviceHistoryList = [];

async function loadServiceHistory() {
    try {
        const response = await fetch(`${API_BASE}/service-history`);
        if (!response.ok) throw new Error("Could not fetch service history");
        serviceHistoryList = await response.json();
        renderServiceHistoryTable();
    } catch (err) {
        console.error("Error loading service history table:", err);
    }
}

function filterServiceHistory() {
    renderServiceHistoryTable();
}

function renderServiceHistoryTable() {
    const tableBody = document.getElementById("serviceHistoryTableBody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    const dateFilterVal = document.getElementById("serviceHistoryDateFilter")?.value; // format: YYYY-MM-DD or empty
    
    let filteredHistory = [...serviceHistoryList];
    if (dateFilterVal) {
        filteredHistory = serviceHistoryList.filter(item => {
            if (!item.endTime) return false;
            // item.endTime is formatted as YYYY-MM-DDTHH:mm:ss
            return item.endTime.startsWith(dateFilterVal);
        });
    }

    if (filteredHistory.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No completed service records found for the selected criteria.</td></tr>`;
        return;
    }

    // Sort history by serviceId descending (newest first)
    const sortedHistory = filteredHistory.sort((a, b) => b.serviceId - a.serviceId);

    let lastDateLabel = "";

    sortedHistory.forEach(item => {
        const completionTime = formatDateTime(item.endTime);
        const tokenNum = item.token ? formatTokenNumber(item.token.tokenNumber) : "??";
        const custName = item.token ? item.token.customerName : "Unknown";
        const waitTimeStr = `${item.waitingTime} min${item.waitingTime !== 1 ? 's' : ''}`;
        const durationStr = `${item.serviceDuration} min${item.serviceDuration !== 1 ? 's' : ''}`;

        const dateLabel = formatLocalDate(item.endTime);
        
        if (dateLabel !== lastDateLabel) {
            lastDateLabel = dateLabel;
            tableBody.innerHTML += `
                <tr class="date-group-header">
                    <td colspan="6" style="background-color: rgba(255, 255, 255, 0.03); font-weight: 700; color: var(--primary-hover); font-size: 13px; letter-spacing: 0.5px; border-bottom: 1px solid var(--border-color); padding: 12px 20px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i data-lucide="calendar" style="width: 15px; height: 15px;"></i>
                            <span>${dateLabel}</span>
                        </div>
                    </td>
                </tr>
            `;
        }

        tableBody.innerHTML += `
            <tr>
                <td style="font-weight:600;">#${item.serviceId}</td>
                <td style="font-weight:700;">${tokenNum}</td>
                <td>${custName}</td>
                <td>${waitTimeStr}</td>
                <td>${durationStr}</td>
                <td style="white-space:nowrap;">${completionTime}</td>
            </tr>
        `;
    });
    
    // Refresh icons
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

let analyticsChartInstance = null;

async function updateAnalyticsCharts() {
    try {
        const historyRes = await fetch(`${API_BASE}/service-history`);
        const queuesRes = await fetch(`${API_BASE}/queues`);
        
        if (!historyRes.ok || !queuesRes.ok) return;

        const history = await historyRes.json();
        const queues = await queuesRes.json();

        // Group history records by queueName
        const queueMetrics = {};
        queues.forEach(q => {
            queueMetrics[q.queueName] = {
                waitTimes: [],
                serviceTimes: []
            };
        });

        history.forEach(item => {
            if (item.token && item.token.queue && item.token.queue.queueName) {
                const qName = item.token.queue.queueName;
                if (!queueMetrics[qName]) {
                    queueMetrics[qName] = { waitTimes: [], serviceTimes: [] };
                }
                if (item.waitingTime !== undefined) queueMetrics[qName].waitTimes.push(item.waitingTime);
                if (item.serviceDuration !== undefined) queueMetrics[qName].serviceTimes.push(item.serviceDuration);
            }
        });

        const labels = Object.keys(queueMetrics);
        const avgWaitTimes = [];
        const avgServiceTimes = [];

        labels.forEach(qName => {
            const metrics = queueMetrics[qName];
            
            const avgWait = metrics.waitTimes.length > 0 
                ? (metrics.waitTimes.reduce((a, b) => a + b, 0) / metrics.waitTimes.length) 
                : 0;
                
            const avgService = metrics.serviceTimes.length > 0 
                ? (metrics.serviceTimes.reduce((a, b) => a + b, 0) / metrics.serviceTimes.length) 
                : 0;

            avgWaitTimes.push(parseFloat(avgWait.toFixed(1)));
            avgServiceTimes.push(parseFloat(avgService.toFixed(1)));
        });

        const ctx = document.getElementById('analyticsChart');
        if (!ctx) return;

        // Destroy previous instance to avoid duplicate rendering bugs
        if (analyticsChartInstance) {
            analyticsChartInstance.destroy();
        }

        const hasData = history.length > 0;
        
        // Define colors matching the design system
        const primaryColor = 'hsl(220, 90%, 56%)';
        const purpleColor = 'hsl(270, 75%, 55%)';
        const textColor = 'hsl(215, 20%, 68%)';
        const gridColor = 'hsla(223, 47%, 22%, 0.4)';

        analyticsChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: hasData ? labels : ["General Counter", "Billing Dept", "Tech Support"],
                datasets: [
                    {
                        label: 'Avg Wait Time (mins)',
                        data: hasData ? avgWaitTimes : [3.5, 6.2, 1.8],
                        backgroundColor: primaryColor,
                        borderColor: primaryColor,
                        borderWidth: 1,
                        borderRadius: 6,
                        barPercentage: 0.6,
                        categoryPercentage: 0.6
                    },
                    {
                        label: 'Avg Serving Time (mins)',
                        data: hasData ? avgServiceTimes : [2.8, 4.5, 5.0],
                        backgroundColor: purpleColor,
                        borderColor: purpleColor,
                        borderWidth: 1,
                        borderRadius: 6,
                        barPercentage: 0.6,
                        categoryPercentage: 0.6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#fff',
                            font: {
                                family: 'Inter',
                                size: 12,
                                weight: '500'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'hsl(222, 47%, 9%)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'hsla(223, 47%, 22%, 0.8)',
                        borderWidth: 1,
                        titleFont: { family: 'Outfit', weight: '600' },
                        bodyFont: { family: 'Inter' }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: textColor,
                            font: {
                                family: 'Inter',
                                size: 11
                            }
                        }
                    },
                    y: {
                        grid: {
                            color: gridColor
                        },
                        ticks: {
                            color: textColor,
                            font: {
                                family: 'Inter',
                                size: 11
                            },
                            callback: function(value) {
                                return value + 'm';
                            }
                        }
                    }
                }
            }
        });

    } catch (err) {
        console.error("Error generating analytics charts:", err);
    }
}

/* ==========================================================================
   USER TOKEN HISTORY MODAL ACTIONS
   ========================================================================== */
async function openMyTokensModal() {
    if (!userSession) {
        showToast("Please sign in to view your token history.");
        return;
    }

    const modal = document.getElementById("myTokensModal");
    const tableBody = document.getElementById("myTokensTableBody");
    if (!modal || !tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Loading your tokens...</td></tr>`;
    modal.classList.remove("hidden");

    try {
        const response = await fetch(`${API_BASE}/tokens/user/${userSession.userId}`);
        if (!response.ok) throw new Error("Could not load your tokens");

        const tokens = await response.json();
        tableBody.innerHTML = "";

        if (tokens.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No generated tokens found for your account.</td></tr>`;
            return;
        }

        tokens.forEach(t => {
            let statusClass = "badge-primary";
            if (t.status === 'SERVING') statusClass = "badge-success";
            else if (t.status === 'COMPLETED') statusClass = "badge-secondary";
            else if (t.status === 'CANCELLED') statusClass = "badge-danger";

            const queueName = t.queue ? t.queue.queueName : "Unknown Department";

            const actionButtons = `
                <div style="display:flex; gap: 8px;">
                    ${(t.status === 'WAITING' || t.status === 'SERVING') ? `
                        <button class="btn btn-secondary" style="padding: 4px 8px; font-size:12px;" onclick="trackToken(${t.tokenId})">Track</button>
                        <button class="btn btn-danger" style="padding: 4px 8px; font-size:12px; background-color: var(--danger);" onclick="cancelTokenFromHistory(${t.tokenId})">Cancel</button>
                    ` : `-`}
                </div>
            `;

            tableBody.innerHTML += `
                <tr>
                    <td style="font-weight: 700;">${formatTokenNumber(t.tokenNumber)}</td>
                    <td>${queueName}</td>
                    <td>${t.customerName}</td>
                    <td><span class="badge ${statusClass}">${t.status}</span></td>
                    <td>${actionButtons}</td>
                </tr>
            `;
        });

        // Initialize newly created icons
        if (typeof lucide !== 'undefined') lucide.createIcons();

    } catch (err) {
        console.error("Error opening tokens modal:", err);
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted text-danger">Error: ${err.message}</td></tr>`;
    }
}

function closeMyTokensModal() {
    const modal = document.getElementById("myTokensModal");
    if (modal) {
        modal.classList.add("hidden");
    }
}

function handleModalOverlayClick(event) {
    if (event.target.id === "myTokensModal") {
        closeMyTokensModal();
    }
}

async function trackToken(tokenId) {
    try {
        const res = await fetch(`${API_BASE}/tokens/${tokenId}`);
        if (!res.ok) throw new Error("Could not find token details");
        
        const token = await res.json();
        localStorage.setItem("SQ_CUSTOMER_TICKET", JSON.stringify(token));
        
        loadCustomerTicket();
        closeMyTokensModal();
        showToast(`Now tracking Token ${formatTokenNumber(token.tokenNumber)}`);
    } catch (err) {
        showToast("Error tracking token: " + err.message);
    }
}

async function cancelTokenFromHistory(tokenId) {
    if (!confirm("Are you sure you want to cancel this queue ticket?")) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/tokens/${tokenId}`, {
            method: 'DELETE'
        });
        
        if (response.ok || response.status === 404) {
            showToast("Ticket cancelled.");
            
            // If the currently active tracked ticket was cancelled, clear it from viewer
            const activeStr = localStorage.getItem("SQ_CUSTOMER_TICKET");
            if (activeStr) {
                const active = JSON.parse(activeStr);
                if (active.tokenId === tokenId) {
                    localStorage.removeItem("SQ_CUSTOMER_TICKET");
                    loadCustomerTicket();
                }
            }
            // Refresh list
            openMyTokensModal();
        } else {
            throw new Error("Unable to delete ticket");
        }
    } catch (err) {
        showToast("Error cancelling: " + err.message);
    }
}