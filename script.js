// ==== CONFIG ====
const slots = [
  '6:00 AM - 7:00 AM', '7:00 AM - 8:00 AM', '8:00 AM - 9:00 AM',
  '4:00 PM - 5:00 PM', '5:00 PM - 6:00 PM', '6:00 PM - 7:00 PM',
  '7:00 PM - 8:00 PM', '8:00 PM - 9:00 PM'
];
const cloudName = 'dxwhobraz';
const uploadPreset = 'turfbooking';

let selectedSlot = null;

// ==== DOM ELEMENTS ====
const dateInput = document.getElementById('dateInput');
const slotsGrid = document.getElementById('slotGrid');
const bookBtn = document.getElementById("bookNowBtn");
const modal = document.getElementById("paymentModal");
const paymentIdInput = document.getElementById('payment-id');
const proofFile = document.getElementById('proof-file');
const confirmBtn = document.getElementById('confirm-btn');
const cancelBtn = document.getElementById('cancel-btn');
const toast = document.getElementById('toast');
const yourSlotBtn = document.getElementById("yourSlotBtn");
const yourSlotBtnDesktop = document.getElementById("yourSlotBtnDesktop");
const yourSlotBtnMobile = document.getElementById("yourSlotBtnMobile");
const yourSlotModal = document.getElementById("yourSlotModal");
const yourSlotList = document.getElementById("yourSlotList");

// ==== INITIALIZE DATE ====
if (dateInput) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  dateInput.value = `${yyyy}-${mm}-${dd}`;
}

// ==== SLOT RENDERING ====
function renderSlots(date) {
  if (!slotsGrid) return;
  // 1. Render all slot buttons immediately (disabled, loading state)
  slotsGrid.innerHTML = "";
  selectedSlot = null;
  bookBtn.disabled = true;

  const loadingBtns = [];
  slots.forEach(slot => {
    const btn = document.createElement("button");
    btn.textContent = slot;
    btn.classList.add("slot-btn", "loading-slot");
    btn.disabled = true;
    slotsGrid.appendChild(btn);
    loadingBtns.push(btn);
  });

  // 2. Fetch booking data and update buttons
  const dbRef = window.firebaseRef(window.firebaseDB, `bookings/${date}`);
  window.firebaseGet(dbRef)
    .then(snapshot => {
      const booked = snapshot.exists() ? snapshot.val() : {};
      // Remove loading state and enable/disable as needed
      slots.forEach((slot, i) => {
        const btn = loadingBtns[i];
        btn.classList.remove("loading-slot");
        btn.disabled = !!booked[slot];
        if (booked[slot]) {
          btn.classList.add("booked");
        } else {
          btn.addEventListener("click", () => {
            document.querySelectorAll(".slot-btn").forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
            selectedSlot = slot;
            bookBtn.disabled = false;
          });
        }
      });
    })
    .catch(err => {
      slotsGrid.innerHTML = '<span style="color:#f66;">Error loading slots.</span>';
      console.error("❌ Failed to fetch slot data:", err);
    });
}

// Initialize Flatpickr on your date input
flatpickr("#dateInput", {
  dateFormat: "Y-m-d",
  minDate: "today",
  theme: "dark", // uses the dark theme you included
  // You can add more options here!
});

// ==== DATE CHANGE ====
if (dateInput) {
  dateInput.addEventListener('change', function() {
    const date = dateInput.value;
    if (!date) return;
    renderSlots(date);
  });
  // Initial load
  renderSlots(dateInput.value);
}

// ==== BOOKING FLOW ====
if (bookBtn) {
  bookBtn.addEventListener("click", () => {
    const user = window.firebaseAuth.currentUser;
    if (!user) {
      toggleLoginModal(true);
      showToast("Please login to book a slot.");
      return;
    }
    if (!selectedSlot || !dateInput.value) {
      return alert("⚠️ Please select a date and time slot.");
    }
    document.getElementById("upiLink").href =
      `upi://pay?pa=dipaktaywade3@okaxis&pn=TurfBooking&am=800&tn=${encodeURIComponent(selectedSlot)}`;
    modal.classList.remove("hidden");
  });
}

if (cancelBtn) {
  cancelBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
    paymentIdInput.value = '';
    proofFile.value = '';
  });
}

if (confirmBtn) {
  confirmBtn.addEventListener("click", async () => {
    const date = dateInput.value;
    const slot = selectedSlot;
    const paymentId = paymentIdInput.value.trim();
    const file = proofFile.files[0];

    if (!paymentId || !file) {
      return alert('❗ Please enter UPI Ref ID and upload screenshot.');
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData
      });
      const uploadData = await uploadRes.json();

      // Get user name
      const user = window.firebaseAuth.currentUser;
      const userName = user.displayName || user.email || "Unknown";

      // Save to bookings/{date}/{slot}
      const dbRef = window.firebaseRef(window.firebaseDB, `bookings/${date}/${slot}`);
      await window.firebaseSet(dbRef, {
        paymentId,
        proofURL: uploadData.secure_url,
        timestamp: Date.now(),
        status: "confirmed",
        name: userName
      });

      // Save to user's bookings
      await saveUserBooking(date, slot, userName);

      showToast("✅ Slot booked successfully!");
      modal.classList.add("hidden");
      paymentIdInput.value = '';
      proofFile.value = '';
      selectedSlot = null;
      bookBtn.disabled = true;
      renderSlots(date);
    } catch (err) {
      console.error("Booking error:", err);
      alert("❌ Booking failed. Try again.");
    }
  });
}

// ==== YOUR SLOT MODAL ====
function toggleYourSlotModal(show) {
  const modal = document.getElementById("yourSlotModal");
  if (modal) modal.classList.toggle("hidden", !show);
  if (show) loadUserSlots();
}
window.toggleYourSlotModal = toggleYourSlotModal;

if (yourSlotBtn) yourSlotBtn.addEventListener("click", () => toggleYourSlotModal(true));
if (yourSlotBtnDesktop) yourSlotBtnDesktop.addEventListener("click", () => toggleYourSlotModal(true));
if (yourSlotBtnMobile) yourSlotBtnMobile.addEventListener("click", () => toggleYourSlotModal(true));

// ==== LOAD USER SLOTS ====
async function loadUserSlots() {
  const user = window.firebaseAuth.currentUser;
  if (!user || !yourSlotList) {
    yourSlotList.innerHTML = "<p>Please login to view your slots.</p>";
    return;
  }
  const db = window.firebaseDB;
  const ref = window.firebaseRef;
  const get = window.firebaseGet;
  try {
    const snap = await get(ref(db, `users/${user.uid}/bookings`));
    if (snap.exists()) {
      const bookings = snap.val();
      yourSlotList.innerHTML = Object.values(bookings).map(
        b => `<div class="slot-card">
          <strong>${b.date}</strong> - ${b.time}<br>
          <span style="font-size:0.95em;color:#888;">Booked by: ${b.name || "Unknown"}</span>
        </div>`
      ).join("");
    } else {
      yourSlotList.innerHTML = "<p>No slots booked yet.</p>";
    }
  } catch (e) {
    console.error("Error loading slots:", e);
    yourSlotList.innerHTML = "<p>Error loading slots.</p>";
  }
}

// ==== SAVE USER BOOKING ====
async function saveUserBooking(date, time, name) {
  const user = window.firebaseAuth.currentUser;
  if (!user) return;
  const db = window.firebaseDB;
  const ref = window.firebaseRef;
  const set = window.firebaseSet;
  const bookingId = `${date}_${time.replace(/[^a-zA-Z0-9]/g, "")}`;
  await set(ref(db, `users/${user.uid}/bookings/${bookingId}`), { date, time, name });
}

// ==== TOAST ====
function showToast(message) {
  toast.textContent = message;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 3000);
}

// ==== NAVBAR & LOGIN ====
window.addEventListener("load", () => {
  // Mobile menu
  const toggle = document.getElementById("mobileMenuButton");
  const menu = document.getElementById("mobileMenu");
  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      menu.classList.toggle("show");
    });
  }

  // Login buttons
  const loginBtnDesktop = document.getElementById("loginNavBtn");
  const loginBtnMobile = document.getElementById("loginNavBtnMobile");
  const auth = window.firebaseAuth;
  const funcs = window.firebaseAuthFunctions;

  function updateLoginButtons(user) {
    if (loginBtnDesktop) loginBtnDesktop.textContent = user ? "Logout" : "Admin/Login";
    if (loginBtnMobile) loginBtnMobile.textContent = user ? "Logout" : "Admin/Login";
  }

  if (auth && funcs) {
    funcs.onAuthStateChanged(auth, (user) => {
      updateLoginButtons(user);
      // Change button behavior
      if (loginBtnDesktop) {
        loginBtnDesktop.onclick = (e) => {
          e.preventDefault();
          if (user) {
            funcs.signOut(auth);
            showToast("Logged out!");
          } else {
            toggleLoginModal(true);
          }
        };
      }
      if (loginBtnMobile) {
        loginBtnMobile.onclick = (e) => {
          e.preventDefault();
          if (user) {
            funcs.signOut(auth);
            showToast("Logged out!");
          } else {
            toggleLoginModal(true);
          }
        };
      }
    });
  }

  // Google Sign-In
  const googleBtn = document.getElementById("googleSignInBtn");
  if (googleBtn) {
    googleBtn.addEventListener("click", async () => {
      const auth = window.firebaseAuth;
      const { GoogleAuthProvider, signInWithPopup } = window.firebaseAuthFunctions;
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
        toggleLoginModal(false);
        showToast("✅ Signed in with Google!");
      } catch (err) {
        alert("❌ Google sign-in failed.");
        console.error(err);
      }
    });
  }
});

// ==== LOGIN MODAL ====
function toggleLoginModal(show) {
  const modal = document.getElementById("loginModal");
  if (modal) modal.classList.toggle("hidden", !show);
}