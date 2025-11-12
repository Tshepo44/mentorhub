// ====== tutor-app.js ======
// This handles all logic for the Tutor App

// Example data for subjects and tutors
const tutorsData = {
    "UP": [
        { name: "Alice", subject: "Math" },
        { name: "Bob", subject: "Physics" }
    ],
    "UJ": [
        { name: "Charlie", subject: "English" },
        { name: "Diana", subject: "Biology" }
    ],
    "WITS": [
        { name: "Eve", subject: "Chemistry" },
        { name: "Frank", subject: "Computer Science" }
    ]
};

// Detect current university from body id
function getUniversity() {
    return document.body.id; // UP / UJ / WITS
}

// Render tutors dynamically
function renderTutors() {
    const uni = getUniversity();
    const container = document.getElementById("tutors-container");
    container.innerHTML = "";

    if (!tutorsData[uni]) return;

    tutorsData[uni].forEach(tutor => {
        const div = document.createElement("div");
        div.classList.add("tutor-card");
        div.innerHTML = `
            <h3>${tutor.name}</h3>
            <p>Subject: ${tutor.subject}</p>
            <button onclick="bookTutor('${tutor.name}')">Book</button>
        `;
        container.appendChild(div);
    });
}

// Book a tutor (local storage)
function bookTutor(name) {
    const uni = getUniversity();
    const bookings = JSON.parse(localStorage.getItem("bookings") || "{}");
    if (!bookings[uni]) bookings[uni] = [];
    bookings[uni].push({ name, date: new Date().toLocaleString() });
    localStorage.setItem("bookings", JSON.stringify(bookings));
    alert(`Booked ${name} successfully!`);
}

// View bookings
function viewBookings() {
    const uni = getUniversity();
    const bookings = JSON.parse(localStorage.getItem("bookings") || "{}");
    const uniBookings = bookings[uni] || [];
    const container = document.getElementById("tutors-container");
    container.innerHTML = "<h2>Your Bookings</h2>";

    if (uniBookings.length === 0) {
        container.innerHTML += "<p>No bookings yet.</p>";
        return;
    }

    uniBookings.forEach(b => {
        const div = document.createElement("div");
        div.classList.add("tutor-card");
        div.innerHTML = `
            <h3>${b.name}</h3>
            <p>Booked at: ${b.date}</p>
        `;
        container.appendChild(div);
    });
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    renderTutors();

    document.getElementById("view-bookings").addEventListener("click", () => {
        viewBookings();
    });

    document.getElementById("back-to-tutors").addEventListener("click", () => {
        renderTutors();
    });
});




