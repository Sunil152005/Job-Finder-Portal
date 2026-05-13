// --- CONFIGURATION ---
const backendURL = "http://localhost:5500/api";
// We get the token right away to see if user is logged in
const token = localStorage.getItem('token');

// --- HELPER FUNCTIONS ---

/**
 * Checks if the user is authenticated (has a token).
 * @returns {boolean} True if logged in, false if not.
 */
function isAuthenticated() {
    return token ? true : false;
}

/**
 * Call this function on pages that require a user to be logged in.
 * It will redirect to 'auth.html' if no token is found.
 */
function protectPage() {
    if (!isAuthenticated()) {
        alert('You must be logged in to access this page.');
        // Redirect to login page, but also save the page they were ON,
        // so we can send them back after login.
        localStorage.setItem('redirectAfterLogin', window.location.pathname);
        window.location.href = 'auth.html';
    }
}

/**
 * Updates the main navigation links based on login status.
 * Shows "Profile" & "Logout" or "Login / Register".
 */
function updateNavLinks() {
    const navLinksContainer = document.getElementById('nav-links');
    if (!navLinksContainer) return;

    // Clear existing auth links
    const existingAuthLinks = navLinksContainer.querySelectorAll('.auth-link');
    existingAuthLinks.forEach(link => link.remove());

    if (isAuthenticated()) {
        // User is LOGGED IN
        // Add "My Profile" link
        const profileLi = document.createElement('li');
        profileLi.className = 'auth-link';
        profileLi.innerHTML = `<a href="profile.html">My Profile</a>`;
        navLinksContainer.appendChild(profileLi);

        // Add "Logout" button
        const logoutLi = document.createElement('li');
        logoutLi.className = 'auth-link';
        logoutLi.innerHTML = `<a href="#" id="logoutButton" class="btn-logout">Logout</a>`;
        navLinksContainer.appendChild(logoutLi);

        // Add event listener to the new logout button
        // We check if it exists first to avoid errors on pages where it's not added yet
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', (e) => {
                e.preventDefault();
                handleLogout();
            });
        }

    } else {
        // User is LOGGED OUT
        const authLi = document.createElement('li');
        authLi.className = 'auth-link';
        authLi.innerHTML = `<a href="auth.html">Login / Register</a>`;
        navLinksContainer.appendChild(authLi);
    }
}

/**
 * Logs the user out, clears the token, and redirects to home.
 */
function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('redirectAfterLogin'); // Clear any pending redirect
    alert('You have been logged out.');
    updateNavLinks(); // Update nav immediately
    window.location.href = 'index.html'; // Redirect to home page
}

/**
 * Toggles visibility of contact info boxes.
 */
function toggleContactInfo(elementId) {
    const contactBox = document.getElementById(`contact-info-${elementId}`);
    if (contactBox) {
        contactBox.classList.toggle('hidden-form');
    }
}

// --- GPS AND MAPS ---
async function getCurrentLocation(inputId) {
    const locationInput = document.getElementById(inputId);
    if (!locationInput) return;

    if ("geolocation" in navigator) {
        locationInput.placeholder = "Fetching your location...";
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
                const data = await response.json();
                if (data && data.display_name) {
                    locationInput.value = data.display_name;
                } else {
                    locationInput.placeholder = "Could not determine address.";
                }
            } catch (error) {
                console.error("Error fetching address:", error);
                locationInput.placeholder = "Could not fetch address.";
            }
        }, (error) => {
            console.error("Geolocation error:", error);
            locationInput.placeholder = "Location access denied.";
            alert("Could not get your location. Please enable location services or enter your location manually.");
        });
    } else {
        alert("Geolocation is not supported by your browser.");
    }
}

// --- DATA FETCHING (Now with Auth!) ---

// Fetch Workers (for Post Job page)
async function fetchWorkers() {
    const workersList = document.getElementById("workersList");
    if (!workersList) return;

    // This is now a protected action, so we must send the token
    const res = await fetch(`${backendURL}/workers`, {
        headers: {
            'Authorization': `Bearer ${token}` // Send the token
        }
    });

    if (!res.ok) {
        workersList.innerHTML = `<p class="error-msg">Could not load workers. Please try logging in again.</p>`;
        return;
    }
    
    const workers = await res.json();
    workersList.innerHTML = workers.map(w => `
      <div class="feature-card">
        <h3>${w.name}</h3>
        <p>Skill: ${w.skill}</p>
        <p>Experience: ${w.experience}</p>
        <p>Location: <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(w.location)}" target="_blank">${w.location}</a></p>
        
        <button class="btn-contact" onclick="toggleContactInfo('worker-${w._id}')">Message Worker</button>
        <div id="contact-info-worker-${w._id}" class="contact-info-box hidden-form">
          <p>Contact at: <strong>${w.contact}</strong></p>
        </div>
      </div>`
    ).join("");
}

// Fetch Jobs (for Post Work page)
async function fetchJobs() {
    const jobsList = document.getElementById("jobsList");
    if (!jobsList) return;

    // This is now a protected action, so we must send the token
    const res = await fetch(`${backendURL}/jobs`, {
        headers: {
            'Authorization': `Bearer ${token}` // Send the token
        }
    });

    if (!res.ok) {
        jobsList.innerHTML = `<p class="error-msg">Could not load jobs. Please try logging in again.</p>`;
        return;
    }

    const jobs = await res.json();
    jobsList.innerHTML = jobs.map(j => `
      <div class="feature-card">
        <h3>${j.title}</h3>
        <p>${j.description}</p>
        <p>Location: <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(j.location)}" target="_blank">${j.location}</a></p>
        <p>Salary: ${j.salary}</p>
        
        <button class="btn-contact" onclick="toggleContactInfo('job-${j._id}')">Message Poster</button>
        <div id="contact-info-job-${j._id}" class="contact-info-box hidden-form">
          <p>Contact at: <strong>${j.contact}</strong></p>
        </div>
      </div>`
    ).join("");
}

/**
 * UPDATED: Fetches the user's own profile data and populates the styled profile page.
 */
async function fetchProfileData() {
    // Select all the elements from profile.html
    const profileContainer = document.getElementById('profile-container');
    const avatar = document.getElementById('profile-avatar');
    const nameEl = document.getElementById('profile-name');
    const emailEl = document.getElementById('profile-email');
    const joinedEl = document.getElementById('profile-joined');
    const logoutBtn = document.getElementById('profile-logout-button');
    const userJobsContainer = document.getElementById('user-jobs-container');
    const userWorkContainer = document.getElementById('user-work-container');

    if (!profileContainer) return; // Not on the profile page

    try {
        const res = await fetch(`${backendURL}/auth/profile/me`, {
            headers: {
                'Authorization': `Bearer ${token}` // Send token
            }
        });

        if (!res.ok) {
            throw new Error('Could not fetch profile. Please log in again.');
        }

        const data = await res.json();
        
        // --- Populate profile card ---
        const userName = data.user.name;
        const userEmail = data.user.email;
        
        avatar.textContent = userName.charAt(0).toUpperCase();
        nameEl.textContent = `Hi, ${userName}!`;
        emailEl.textContent = userEmail;
        joinedEl.textContent = new Date(data.user.date).toLocaleDateString();
        logoutBtn.addEventListener('click', handleLogout);

        // --- (CHANGE IS HERE) ---
        // --- Populate user's job postings ---
        if (data.jobs && data.jobs.length > 0) {
            // Only show this section if jobs exist
            userJobsContainer.innerHTML = `
                <h3>Your Job Postings</h3>
                ${data.jobs.map(j => `
                    <div class="feature-card">
                        <h3>${j.title}</h3>
                        <p>${j.description}</p>
                        <p>Salary: ${j.salary}</p>
                    </div>
                `).join('')}
            `;
        } else {
            // Do nothing, the div will remain empty
            userJobsContainer.innerHTML = ""; 
        }

        // --- (CHANGE IS HERE) ---
        // --- Populate user's worker profiles ---
        if (data.workers && data.workers.length > 0) {
            // Only show this section if worker profiles exist
            userWorkContainer.innerHTML = `
                <h3>Your Worker Profiles</h3>
                ${data.workers.map(w => `
                    <div class="feature-card">
                        <h3>${w.name}</h3>
                        <p>Skill: ${w.skill}</p>
                        <p>Experience: ${w.experience}</p>
                    </div>
                `).join('')}
            `;
        } else {
            // Do nothing, the div will remain empty
            userWorkContainer.innerHTML = "";
        }

    } catch (error) {
        if (profileContainer) {
            profileContainer.innerHTML = `<p class="error-msg">${error.message}</p>`;
        }
        if (userJobsContainer) userJobsContainer.innerHTML = "";
        if (userWorkContainer) userWorkContainer.innerHTML = "";
        
        setTimeout(() => {
             handleLogout();
        }, 3000);
    }
}


// --- FORM SUBMISSION ---
// We find the forms first, outside the DOM listener
const jobForm = document.getElementById("jobForm");
const workerForm = document.getElementById("workerForm");
const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
const contactForm = document.getElementById('contactForm');

if (jobForm) {
    jobForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = {
            title: jobForm.title.value,
            description: jobForm.description.value,
            location: jobForm.location.value,
            salary: jobForm.salary.value,
            contact: jobForm.contact.value,
        };
        const res = await fetch(`${backendURL}/jobs`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` // MUST send token to post
            },
            body: JSON.stringify(data),
        });
        if (res.ok) {
            alert("Job Posted Successfully!");
            jobForm.reset();
            fetchWorkers(); // Refresh list
        } else {
            alert("Error posting job. Please try again.");
        }
    });
}

if (workerForm) {
    workerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = {
            name: workerForm.name.value,
            skill: workerForm.skill.value,
            experience: workerForm.experience.value,
            location: workerForm.location.value,
            contact: workerForm.contact.value,
        };
        const res = await fetch(`${backendURL}/workers`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` // MUST send token to post
            },
            body: JSON.stringify(data),
        });
        if (res.ok) {
            alert("Worker Registered Successfully!");
            workerForm.reset();
            fetchJobs(); // Refresh list
        } else {
            alert("Error registering worker. Please try again.");
        }
    });
}

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            name: contactForm.name.value,
            email: contactForm.email.value,
            message: contactForm.message.value,
        };
        try {
            const res = await fetch(`${backendURL}/contact`, { // Note: /api/contact in server.js
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                alert('Message sent! We will get back to you soon.');
                contactForm.reset();
            } else {
                alert('Error: Could not send message.');
            }
        } catch (error) {
            console.error('Contact form error:', error);
            alert('A network error occurred. Please try again.');
        }
    });
}


// --- INITIALIZATION (Runs on EVERY page load) ---

window.addEventListener("DOMContentLoaded", () => {
    
    // 1. Update nav links on every page
    updateNavLinks();

    // 2. Get current page path
    const currentPage = window.location.pathname;

    // 3. Page-specific logic
    if (currentPage.includes('auth.html')) {
        // --- AUTH PAGE LOGIC (Register/Login) ---

        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const data = {
                    name: registerForm.name.value,
                    email: registerForm.email.value,
                    password: registerForm.password.value,
                };
                const res = await fetch(`${backendURL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                const result = await res.json();
                if (res.ok) {
                    alert('Registration successful! Please log in.');
                    // Switch to login form automatically
                    registerForm.classList.add('hidden-form');
                    loginForm.classList.remove('hidden-form');
                    document.getElementById('switchToLogin').classList.add('hidden-form');
                    document.getElementById('switchToRegister').classList.remove('hidden-form');
                } else {
                    alert(`Error: ${result.msg}`);
                }
            });
        }

        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const data = {
                    email: loginForm.email.value,
                    password: loginForm.password.value,
                };
                const res = await fetch(`${backendURL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                const result = await res.json();
                if (res.ok) {
                    localStorage.setItem('token', result.token);
                    alert('Login successful!');
                    // Check if we were sent here from another page
                    const redirectUrl = localStorage.getItem('redirectAfterLogin');
                    localStorage.removeItem('redirectAfterLogin'); // Clear it
                    // Check for null or if redirectUrl is the auth page itself
                    if (redirectUrl && !redirectUrl.includes('auth.html')) {
                         window.location.href = redirectUrl;
                    } else {
                         window.location.href = 'index.html'; // Go to home
                    }
                } else {
                    alert(`Error: ${result.msg}`);
                }
            });
        }
        
        // --- Password Toggle Logic ---
        const toggleIcons = document.querySelectorAll('.toggle-password');
        toggleIcons.forEach(icon => {
            icon.addEventListener('click', () => {
                const passwordInput = icon.previousElementSibling;
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    passwordInput.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });

        // --- Form Switching Logic ---
        const switchToLogin = document.getElementById('switchToLogin');
        const switchToRegister = document.getElementById('switchToRegister');
        if (switchToLogin && switchToRegister && registerForm && loginForm) {
            switchToLogin.querySelector('a').addEventListener('click', (e) => {
                e.preventDefault();
                registerForm.classList.add('hidden-form');
                loginForm.classList.remove('hidden-form');
                switchToLogin.classList.add('hidden-form');
                switchToRegister.classList.remove('hidden-form');
            });
            switchToRegister.querySelector('a').addEventListener('click', (e) => {
                e.preventDefault();
                loginForm.classList.add('hidden-form');
                registerForm.classList.remove('hidden-form');
                switchToRegister.classList.add('hidden-form');
                switchToLogin.classList.remove('hidden-form');
            });
        }

    } else if (currentPage.includes('postJob.html') || currentPage.includes('postWork.html')) {
        // --- PROTECTED PAGES LOGIC ---
        protectPage(); // <-- This is the security check!
        
        if (isAuthenticated()) {
            fetchWorkers(); // On postJob page
            fetchJobs(); // On postWork page
        }

    } else if (currentPage.includes('profile.html')) {
        // --- PROFILE PAGE LOGIC ---
        protectPage(); // <-- This is the security check!
        
        if (isAuthenticated()) {
            fetchProfileData(); // Get user's info
        }

    } else if (currentPage.includes('index.html') || currentPage === '/' || currentPage === '') {
        // --- HOME PAGE LOGIC (PUBLIC) ---
        // Protect the main action buttons
        
        // Find buttons by their href
        const postJobBtn = document.querySelector('a[href="postJob.html"]');
        const postWorkBtn = document.querySelector('a[href="postWork.html"]'); // Assuming this is your "Find a Job"
        
        if(postJobBtn) {
            postJobBtn.addEventListener('click', (e) => {
                if (!isAuthenticated()) {
                    e.preventDefault(); // Stop navigation
                    alert('Please log in or register to post a job.');
                    localStorage.setItem('redirectAfterLogin', 'postJob.html'); // Save where they wanted to go
                    window.location.href = 'auth.html'; // Send to login
                }
            });
        }
        
        if(postWorkBtn) {
             postWorkBtn.addEventListener('click', (e) => {
                if (!isAuthenticated()) {
                    e.preventDefault(); // Stop navigation
                    alert('Please log in or register to find a job.');
                    localStorage.setItem('redirectAfterLogin', 'postWork.html');
                    window.location.href = 'auth.html'; // Send to login
                }
            });
        }
    }
});


