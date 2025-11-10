// app.js
document.addEventListener("DOMContentLoaded", function() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", function(e) {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const error = document.getElementById("error");

    const validUser = {
      username: "student@uni.ac.za",
      password: "12345"
    };

    if (username === validUser.username && password === validUser.password) {
      localStorage.setItem("currentUser", username);
      window.location.href = "student-portal.html";
    } else {
      error.textContent = "❌ Incorrect username or password. Please try again.";
    }
  });
});
