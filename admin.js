// Assumes firebase.js is loaded first

const db = window.firebaseDB;
const ref = window.firebaseRef;
const get = window.firebaseGet;
const set = window.firebaseSet;
const bookingsTableBody = document.getElementById("bookingsTableBody");

// Fetch all bookings from /bookings/{date}/{slot}
async function loadAllBookings() {
  bookingsTableBody.innerHTML = "<tr><td colspan='7'>Loading...</td></tr>";
  try {
    const allBookingsSnap = await get(ref(db, "bookings"));
    if (!allBookingsSnap.exists()) {
      bookingsTableBody.innerHTML = "<tr><td colspan='7'>No bookings found.</td></tr>";
      return;
    }
    const bookingsData = allBookingsSnap.val();
    // Flatten bookings: [{date, slot, ...data}]
    let all = [];
    Object.entries(bookingsData).forEach(([date, slots]) => {
      Object.entries(slots).forEach(([slot, data]) => {
        all.push({ date, slot, ...data });
      });
    });
    // Sort by date and slot time
    all.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.slot.localeCompare(b.slot);
    });
    // Render
    bookingsTableBody.innerHTML = all.map(b => `
      <tr>
        <td data-label="Date">${b.date}</td>
        <td data-label="Slot Time">${b.slot}</td>
        <td data-label="Booker Name">${b.name || "Unknown"}</td>
        <td data-label="Payment Ref">${b.paymentId || "-"}</td>
        <td data-label="Screenshot">
          ${b.proofURL ? `<a href="${b.proofURL}" target="_blank"><img src="${b.proofURL}" alt="Payment Screenshot"></a>` : "-"}
        </td>
        <td data-label="Status" class="status-${b.status || 'pending'}">${b.status || "pending"}</td>
        <td data-label="Remove">
          <button class="remove-btn" onclick="removeBooking('${b.date}','${b.slot}')">Remove</button>
        </td>
      </tr>
    `).join("");
  } catch (e) {
    bookingsTableBody.innerHTML = "<tr><td colspan='7'>Error loading bookings.</td></tr>";
    console.error(e);
  }
}

// Remove booking from DB
window.removeBooking = async function(date, slot) {
  if (!confirm(`Remove booking for ${date} - ${slot}?`)) return;
  try {
    // Remove from /bookings/{date}/{slot}
    await set(ref(db, `bookings/${date}/${slot}`), null);
    // Optionally: Remove from user's bookings as well (if you store userId in booking)
    loadAllBookings();
    alert("Booking removed.");
  } catch (e) {
    alert("Failed to remove booking.");
    console.error(e);
  }
};

loadAllBookings();