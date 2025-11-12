// tutor-app.js
// All-in-one frontend + local "backend" logic for UP, UJ, WITS tutor app

// --- UNIVERSITY CONFIG ---
const universityData = {
    "UP": { color: "#1e90ff" },
    "UJ": { color: "#ff4500" },
    "WITS": { color: "#32cd32" }
};

// Detect university from HTML title
const university = document.title.split(" ")[0] || "UP";

// --- MOCK STUDENT REQUESTS ---
let studentRequests = [];
const subjects = ["Math", "Physics", "Chemistry", "Biology", "Computer Science"];
const topics = ["Algebra", "Mechanics", "Organic Chemistry", "Genetics", "Algorithms"];
const names = ["Alice", "Bob", "Charlie", "Diana", "Ethan"];

// Generate random student request
function generateRequest() {
    const student = names[Math.floor(Math.random() * names.length)];
    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const difficulty = ["Easy", "Medium", "Hard"][Math.floor(Math.random() * 3)];
    const request = {
        student,
        subject,
        topic,
        difficulty,
        time: new Date().toLocaleTimeString()
    };
    studentRequests.push(request);
    displayRequests();
    updateAnalytics();
}

// --- DISPLAY STUDENT REQUESTS ---
function displayRequests() {
    const container = document.getElementById("requests");
    container.innerHTML = "";
    studentRequests.slice(-5).reverse().forEach(req => {
        const card = document.createElement("div");
        card.className = "request-card";
        card.innerHTML = `
            <h3>${req.student}</h3>
            <p>Subject: ${req.subject}</p>
            <p>Topic: ${req.topic}</p>
            <p>Difficulty: ${req.difficulty}</p>
            <p><small>${req.time}</small></p>
        `;
        container.appendChild(card);
    });
}

// --- ANALYTICS DASHBOARD ---
function updateAnalytics() {
    const analytics = document.getElementById("analytics");
    const subjectCount = {};
    subjects.forEach(s => subjectCount[s] = 0);
    studentRequests.forEach(r => subjectCount[r.subject]++);
    
    // Radial chart (simple)
    analytics.innerHTML = "";
    subjects.forEach(s => {
        const div = document.createElement("div");
        div.className = "radial";
        div.style.borderColor = universityData[university].color;
        div.innerHTML = `<span>${s}: ${subjectCount[s]}</span>`;
        analytics.appendChild(div);
    });
}

// --- VIDEO & RESOURCES ---
function loadResources() {
    const video = document.getElementById("video");
    video.innerHTML = `
        <video width="300" controls>
            <source src="sample-video.mp4" type="video/mp4">
            Your browser does not support the video tag.
        </video>
    `;
    const resources = document.getElementById("resources");
    resources.innerHTML = `
        <ul>
            <li>Resource 1</li>
            <li>Resource 2</li>
            <li>Resource 3</li>
        </ul>
    `;
}

// --- INIT ---
function initApp() {
    document.getElementById("university").textContent = university;
    document.getElementById("generate").addEventListener("click", generateRequest);
    loadResources();
    updateAnalytics();
}

// Wait for DOM
document.addEventListener("DOMContentLoaded", initApp);





