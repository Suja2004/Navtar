const API_URL = "https://navatar-ashen.vercel.app";

// Get all bookings
export async function getBookings() {
  const response = await fetch(`${API_URL}/bookings/`);
  if (!response.ok) throw new Error("Failed to fetch bookings");
  return response.json();
}

// Get a specific booking by ID
export async function getBooking(id) {
  const response = await fetch(`${API_URL}/bookings/${id}`);
  if (!response.ok) throw new Error("Failed to fetch booking");
  return response.json();
}

// Get bookings by hospital ID
export async function getBookingsByHospital(hospitalId) {
  const response = await fetch(`${API_URL}/bookings/hospital/${hospitalId}`);
  if (!response.ok) throw new Error("Failed to fetch bookings by hospital");
  return response.json();
}

// Create a new booking
export async function createBooking(booking) {
  const response = await fetch(`${API_URL}/bookings/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(booking),
  });
  if (!response.ok) throw new Error("Failed to create booking");
  return response.json();
}

// Update booking status
export async function updateBookingStatus(id, status) {
  const response = await fetch(`${API_URL}/bookings/bookings/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error("Failed to update booking status");
  return response.json();
}

// Delete a booking
export async function deleteBooking(id) {
  const response = await fetch(`${API_URL}/bookings/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete booking");
  return response.ok;
}

// Get navatars by hospital ID
export async function getNavatarsByHospital(hospitalId) {
  const response = await fetch(
    `${API_URL}/superadmin/navatars/${hospitalId}/navatars`
  );
  if (!response.ok) throw new Error("Failed to fetch navatars by hospital");
  return response.json();
}

export async function getDoctorByEmail(email) {
  try {
    const response = await fetch(`${API_URL}/admin/doctors/by-email/${email}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    return null;
  }
}

export async function getNurseByEmail(email) {
  try {
    const response = await fetch(`${API_URL}/admin/nurses/by-email/${email}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    return null;
  }
}

export async function getUserByEmail(email) {
  const [doctor, nurse] = await Promise.all([
    getDoctorByEmail(email),
    getNurseByEmail(email),
  ]);

  if (doctor) return { role: "doctor", data: doctor };
  if (nurse) return { role: "nurse", data: nurse };
  return { role: null, data: null };
}
