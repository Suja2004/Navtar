import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

function MyBookings({ role, doctor, bookings, navatars, onSelectBookingForCancellation }) {
    const navigate = useNavigate();
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setNow(new Date());
        }, 30000);

        return () => clearInterval(timer);
    }, []);
    
    const [showReminder, setShowReminder] = useState(false);
    const [reminder, setReminder] = useState('');
    const [notifiedIntervals, setNotifiedIntervals] = useState({});

    const upcomingBookings = useMemo(() => {
        if (!bookings) return [];
        return bookings
            .map(slot => ({ ...slot, date: new Date(slot.date) }))
            .filter(slot => {
                const [endHour, endMinute] = slot.end_time.split(':').map(Number);
                const slotEnd = new Date(slot.date);
                slotEnd.setHours(endHour, endMinute, 0, 0);
                return slotEnd > now;
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date) || a.start_time.localeCompare(b.start_time));
    }, [bookings, now]);

    useEffect(() => {

        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        const checkReminders = () => {
            const now = new Date();
            let foundReminder = null;
            const newNotifiedIntervals = { ...notifiedIntervals };

            if (upcomingBookings.length > 0) {
                const slot = upcomingBookings[0];
                const [startHour, startMinute] = slot.start_time.split(':').map(Number);
                const slotStart = new Date(slot.date);
                slotStart.setHours(startHour, startMinute, 0, 0);

                const diffInMinutes = (slotStart - now) / 60000 + 1;
                const slotId = slot.start_time + slot.date;

                if (diffInMinutes >= 0 && diffInMinutes <= 30) {
                    const interval = [1, 5, 10, 30].find(i => Math.abs(diffInMinutes - i) < 0.5);
                    if (interval) {
                        if (!newNotifiedIntervals[slotId] || !newNotifiedIntervals[slotId].includes(interval)) {
                            if (interval === 1 && diffInMinutes == 1) {
                                foundReminder = Math.floor(diffInMinutes) > 0
                                    ? `Your session with Navatar starts in ${Math.floor(diffInMinutes)} minute! Almost time!`
                                    : 'Your session with Navatar started!';
                            } else {
                                foundReminder = Math.floor(diffInMinutes) > 0
                                    ? `Your session with Navatar starts in ${Math.floor(diffInMinutes)} minutes! Be Ready!`
                                    : 'Your session with Navatar started!';
                            }

                            newNotifiedIntervals[slotId] = [...(newNotifiedIntervals[slotId] || []), interval];
                        }
                    }
                }
            }

            if (foundReminder) {
                setReminder(foundReminder);
                setShowReminder(true);
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(foundReminder);
                }
            }
            setNotifiedIntervals(newNotifiedIntervals);
        };

        checkReminders();
        const interval = setInterval(checkReminders, 45000);
        return () => clearInterval(interval);
    }, [bookings]);


    if (role === 'nurse' && !doctor) {
        return (
            <div className="my-bookings-list">
                <h1>Select a Doctor</h1>
                <p className="no-bookings">Please select a doctor to view their bookings.</p>
            </div>
        );
    }

    if (bookings.length === 0 || upcomingBookings.length === 0) {
        return (
            <div className="my-bookings-list">
                <h1>{role === 'nurse' ? `${doctor}'s` : 'My'} Bookings</h1>
                <p className="no-bookings">No upcoming bookings found.</p>
            </div>
        );
    }

    return (
        <div className="my-bookings-list">
            <h1>{role === 'nurse' ? `${doctor}'s` : 'My'} Bookings</h1>
            {showReminder && (
                <div className="popup reminder">
                    <span>{reminder}</span>
                    <button className="close-reminder" onClick={() => setShowReminder(false)}>×</button>
                </div>
            )}
            <ul>
                {upcomingBookings.map((slot, index) => {
                    const [startHour, startMinute] = slot.start_time.split(':').map(Number);
                    const slotStart = new Date(slot.date);
                    slotStart.setHours(startHour, startMinute, 0, 0);

                    const [endHour, endMinute] = slot.end_time.split(':').map(Number);
                    const slotEnd = new Date(slot.date);
                    slotEnd.setHours(endHour, endMinute, 0, 0);

                    const isOngoing = now >= slotStart && now < slotEnd;
                    const navatar = navatars?.find(n => String(n.navatar_id) === String(slot.navatar_id));

                    return (
                        <li
                            key={index}
                            className={`my-booking-item ${isOngoing ? 'ongoing' : ''}`}
                            style={{ '--delay': `${(index + 1)}s` }}
                        >
                            <div className="booking-info">
                                <div className='navatar-details'>
                                    <div>Navatar: {navatar?.navatar_name || 'Unknown Navatar'}</div>
                                    <div className="booking-location">Location: {navatar?.location || 'Location not set'}</div>
                                </div>
                                <div className="time-detalis">
                                    <span>{format(slot.date, 'MMMM d, yyyy')}</span>
                                    <span>
                                        {new Date(`1970-01-01T${slot.start_time}`).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                    -
                                    <span>
                                        {new Date(`1970-01-01T${slot.end_time}`).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                </div>
                            </div>
                            <div className="booking-actions">
                                {isOngoing ? (
                                    role === 'nurse' ? (
                                        <span className="text-success">Session Started</span>
                                    ) : (
                                        <button
                                            className="btn btn-success"
                                            onClick={() => navigate('/consultation')}
                                        >
                                            Start
                                        </button>
                                    )
                                ) : null}

                                <button
                                    className="btn btn-danger"
                                    onClick={() => onSelectBookingForCancellation(slot)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </li>

                    );
                })}
            </ul>
        </div>
    );
}

export default MyBookings;
