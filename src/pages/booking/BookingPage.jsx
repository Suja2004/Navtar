import { useState, useEffect } from 'react';
import {
  isBefore, parse, format, eachDayOfInterval,
  isSameDay, addDays
} from 'date-fns';

import { useUser } from '@clerk/clerk-react';
import { getBookingsByHospital, createBooking, deleteBooking, getUserByEmail, listDoctors, getNavatarsByHospital } from '../../context/api';

import Navbar from '../../components/common/Navbar';
import CalendarGrid from './CalendarGrid';
import TimeSelectorModal from './TimeSelectorModal';
import BookingActionModal from './BookingActionModal';
import MyBookings from './MyBookings';
import NotificationPopup from './NotificationPopup';
import NavatarList from './NavatarList';
import './BookingPage.css';

function BookingPage() {
  const { user, isLoaded } = useUser();
  const [userData, setUserData] = useState(null);
  const [role, setRole] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [doctorsList, setDoctorsList] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [navatars, setNavatars] = useState([]);

  const [calendarDays, setCalendarDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedNavatar, setSelectedNavatar] = useState(null);
  const [selectedStartTime, setSelectedStartTime] = useState('');
  const [selectedEndTime, setSelectedEndTime] = useState('');

  const [isNavatarSelectorOpen, setIsNavatarSelectorOpen] = useState(false);
  const [isTimeSelectorOpen, setIsTimeSelectorOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionModalType, setActionModalType] = useState('');

  const [bookedSlots, setBookedSlots] = useState([]);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [popup, setPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [popupType, setPopupType] = useState('');

  const delay = 3000;

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!isLoaded || !user?.primaryEmailAddress?.emailAddress) return;

      const email = user.primaryEmailAddress.emailAddress;
      const { role, data } = await getUserByEmail(email);

      if (role === "doctor") {
        setUserData({
          id: data.id,
          hospital_id: data.hospital_id,
        });
        setRole("doctor");
        setSelectedDoctorId(data.id);
      } else if (role === "nurse") {
        setUserData({
          id: data.id,
          hospital_id: data.hospital_id,
          assigned_doctor_id: data.assigned_doctor_id,
        });
        setRole("nurse");
        try {
          const response = await listDoctors(data.hospital_id);
          setDoctorsList(response);
        } catch (err) {
          console.error("Failed to fetch doctors for nurse:", err);
        }
      } else {
        setUserData(null);
        setRole(null);
      }
      setUserLoading(false);
    };

    fetchUserDetails();
  }, [isLoaded, user]);

  useEffect(() => {
    const isAnyModalOpen = isTimeSelectorOpen || isActionModalOpen;
    document.body.style.overflow = isAnyModalOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isTimeSelectorOpen, isActionModalOpen]);

  useEffect(() => {
    if (!userData?.hospital_id) return;
    getBookingsByHospital(userData.hospital_id)
      .then(setBookedSlots)
      .catch(() => {
        setPopupMessage('Failed to load bookings.');
        setPopupType('error');
        setPopup(true);
        setTimeout(() => setPopup(false), delay);
      });
  }, [userData]);

  useEffect(() => {
    const today = new Date();
    const end = addDays(today, 34);
    const days = eachDayOfInterval({ start: today, end });
    setCalendarDays(days);
  }, []);

  useEffect(() => {
    if (!userData?.hospital_id) return;

    async function fetchNavatars() {
      try {
        const data = await getNavatarsByHospital(userData.hospital_id);
        setNavatars(data);
      } catch (err) {
        console.error("Error fetching navatars:", err);
      }
    }
    fetchNavatars();
  }, [userData]);

  if (!isLoaded || userLoading) {
    return (
      <>
        <Navbar />
        <div className="loading">Loading...</div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Navbar />
        <div className="loading">User not authenticated</div>
      </>
    );
  }

  if (role === null) {
    return (
      <>
        <Navbar />
        <div className="loading">Access denied. User not recognized as nurse or doctor.</div>
      </>
    );
  }

  const myBookings = bookedSlots.filter(slot => {
    return String(slot.doctor_id) === String(selectedDoctorId);
  });


  const handleDoctorChange = (e) => {
    const name = e.target.value;
    setInputValue(name);

    const matchedDoctor = doctorsList.find((doc) => doc.name === name);
    if (matchedDoctor) {
      setSelectedDoctorId(matchedDoctor.id);
    } else {
      setSelectedDoctorId("");
    }
  };

  const handleDateClick = (day) => {
    if (role === "nurse" && !selectedDoctorId) {
      setPopupMessage('Select a Doctor');
      setPopupType('error');
      setPopup(true);
      setTimeout(() => setPopup(false), delay);
      return;
    }
    setSelectedDate(day);
    setSelectedNavatar(null);
    setIsNavatarSelectorOpen(true);
  };

  const handleSelectNavatar = (navatar) => {
    setSelectedNavatar(navatar);
    setIsTimeSelectorOpen(true);
    setSelectedStartTime('');
    setSelectedEndTime('');
  };

  const isSlotOverlapping = (selectedDoctorId, date, startTime, endTime, slotsList, navatarId) => {
    if (!startTime || !endTime || !date || !navatarId || !selectedDoctorId) return false;

    const newStart = parse(
      `${format(date, 'yyyy-MM-dd')} ${startTime}`,
      'yyyy-MM-dd HH:mm',
      new Date()
    );
    const newEnd = parse(
      `${format(date, 'yyyy-MM-dd')} ${endTime}`,
      'yyyy-MM-dd HH:mm',
      new Date()
    );

    return slotsList.some(slot => {
      const sameDate = slot.date === format(date, 'yyyy-MM-dd');
      if (!sameDate) return false;

      const existingStart = parse(
        `${slot.date} ${slot.start_time}`,
        'yyyy-MM-dd HH:mm:ss',
        new Date()
      );
      const existingEnd = parse(
        `${slot.date} ${slot.end_time}`,
        'yyyy-MM-dd HH:mm:ss',
        new Date()
      );

      const isOverlapping = newStart < existingEnd && newEnd > existingStart;

      // Condition 1: Same navatar overlap (by any doctor)
      const navatarConflict = String(slot.navatar_id) === String(navatarId);

      // Condition 2: Same doctor overlap (with any navatar)
      const doctorConflict = String(slot.doctor_id) === String(selectedDoctorId);

      if (isOverlapping && (navatarConflict || doctorConflict)) {
        console.log("❌ Conflict:", {
          navatarConflict,
          doctorConflict,
          slot,
          newStart,
          newEnd,
        });
        return true;
      }

      return false;
    });
  };

  const handleCheckAvailability = () => {
    if (!selectedDate || !selectedStartTime || !selectedEndTime) {
      setPopupMessage('Please select a date and both start and end times.');
      setPopupType('error');
      setPopup(true);
      setTimeout(() => setPopup(false), delay);
      return;
    }
    const newStart = parse(`${format(selectedDate, 'yyyy-MM-dd')} ${selectedStartTime}`, 'yyyy-MM-dd HH:mm', new Date());
    if (isSameDay(Date.now(), selectedDate) && isBefore(newStart, new Date())) {
      setMessage("You cannot book a slot in the past.");
      setActionModalType('booked');
      setIsActionModalOpen(true);
      setIsTimeSelectorOpen(false);
      return;
    }
    if (isSlotOverlapping(selectedDoctorId, selectedDate, selectedStartTime, selectedEndTime, bookedSlots, selectedNavatar.navatar_id)) {
      setMessage("This slot is already booked.");
      setActionModalType('booked');
      setIsActionModalOpen(true);
      setIsTimeSelectorOpen(false);
      return;
    }
    setActionModalType('confirm');
    setIsActionModalOpen(true);
    setIsTimeSelectorOpen(false);
  };

  const handleConfirmBooking = async () => {
    setConfirmLoading(true);

    if (!selectedDate || !selectedStartTime || !selectedEndTime) {
      setPopupMessage('Please select a date and both start and end times.');
      setPopupType('error');
      setPopup(true);
      setTimeout(() => setPopup(false), delay);
      return;
    }

    const newBooking = {
      date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: selectedStartTime,
      end_time: selectedEndTime,
      doctor_id: role === 'doctor' ? userData?.id : selectedDoctorId,
      nurse_id: role === 'nurse' ? userData?.id : null,
      navatar_id: selectedNavatar?.navatar_id || null,
      location: selectedNavatar?.location || "Ward",
      status: "Booked"
    };

    try {
      await createBooking(newBooking);
      setPopupMessage(`Booking confirmed for ${format(selectedDate, 'MMMM d, yyyy')} from ${selectedStartTime} to ${selectedEndTime}`);
      setPopupType('success');
      getBookingsByHospital(userData.hospital_id).then(setBookedSlots);
    } catch (error) {
      setPopupMessage(`Failed to save booking. ${error?.response?.data?.detail || error.message || 'Please try again.'}`);
      setPopupType('error');
    }


    setPopup(true);
    setTimeout(() => setPopup(false), delay);
    setIsActionModalOpen(false);
    setIsNavatarSelectorOpen(false);
    setConfirmLoading(false);
  };

  const handleSelectBookingForCancellation = (slotToCancel) => {
    const date = new Date(slotToCancel?.date);
    if (isNaN(date.getTime())) return;

    setSelectedDate(date);
    setSelectedStartTime(slotToCancel.start_time);
    setSelectedEndTime(slotToCancel.end_time);
    setActionModalType('delete');
    setIsActionModalOpen(true);
  };

  const handleDeleteBooking = async () => {
    setDeleteLoading(true);

    const bookingToDelete = bookedSlots.find(slot =>
      slot.date === format(selectedDate, 'yyyy-MM-dd') &&
      slot.start_time === selectedStartTime &&
      slot.end_time === selectedEndTime
    );

    if (!bookingToDelete) {
      setPopupMessage('Booking not found or already deleted.');
      setPopupType('error');
      setPopup(true);
      setTimeout(() => setPopup(false), delay);
      setDeleteLoading(false);
      return;
    }

    try {
      await deleteBooking(bookingToDelete.booking_id);
      setPopupMessage(`Booking cancelled for ${format(selectedDate, 'MMMM d, yyyy')} at ${selectedStartTime}`);
      setPopupType('success');
      getBookingsByHospital(userData.hospital_id).then(setBookedSlots);
    } catch {
      setPopupMessage('Failed to update bookings. Please try again.');
      setPopupType('error');
    }

    setPopup(true);
    setTimeout(() => setPopup(false), delay);
    setIsActionModalOpen(false);
    setDeleteLoading(false);
  };

  const handleTimeSelectorOverlayClick = (e) => {
    if (e.target === e.currentTarget) setIsTimeSelectorOpen(false);
  };

  const handleNavatarOverlayClick = (e) => {
    if (e.target === e.currentTarget) setIsNavatarSelectorOpen(false);
  };

  return (
    <>
      <Navbar />
      <div className="booking-page">
        <div className="doctor-list">
          {role === "nurse" && doctorsList && (
            <>
              <h4>Handling Booking For</h4>
              <input
                list="doctor-options"
                value={inputValue}
                onChange={handleDoctorChange}
                placeholder="Doctor"
              />
              <datalist id="doctor-options">
                {doctorsList.map((doc) => (
                  <option key={doc.id} value={doc.name} />
                ))}
              </datalist>
            </>
          )}

        </div>
        <div className='main-booking-content'>
          <div className="booking-container">
            <h1>Book Navatar Robot</h1>
            <p>Select a date from the dates below:</p>
            <CalendarGrid
              calendarDays={calendarDays}
              selectedDate={selectedDate}
              onDateClick={handleDateClick}
            />
          </div>


          <MyBookings
            role={role}
            doctor={inputValue}
            bookings={myBookings}
            navatars={navatars}
            onSelectBookingForCancellation={handleSelectBookingForCancellation}
          />
        </div>
      </div>

      <TimeSelectorModal
        isOpen={isTimeSelectorOpen}
        onClose={() => setIsTimeSelectorOpen(false)}
        selectedDate={selectedDate}
        selectedNavatar={selectedNavatar}
        selectedStartTime={selectedStartTime}
        onStartTimeChange={setSelectedStartTime}
        selectedEndTime={selectedEndTime}
        onEndTimeChange={setSelectedEndTime}
        onCheckAvailability={handleCheckAvailability}
        onOverlayClick={handleTimeSelectorOverlayClick}
      />

      <BookingActionModal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        modalType={actionModalType}
        selectedDate={selectedDate}
        selectedStartTime={selectedStartTime}
        selectedEndTime={selectedEndTime}
        message={message}
        onConfirm={handleConfirmBooking}
        onDelete={handleDeleteBooking}
        confirmLoading={confirmLoading}
        deleteLoading={deleteLoading}
      />

      <NotificationPopup
        isOpen={popup}
        message={popupMessage}
        type={popupType}
        onClose={() => setPopup(false)}
      />
      <NavatarList
        navatars={navatars}
        selectedDate={selectedDate}
        isNavatarSelectorOpen={isNavatarSelectorOpen}
        onSelectNavatar={handleSelectNavatar}
        onOverlayClick={handleNavatarOverlayClick}
      />
    </>
  );
}

export default BookingPage;
