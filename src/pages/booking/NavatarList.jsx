import React, { useEffect, useState } from "react";

const NavatarList = ({ navatars, isNavatarSelectorOpen, selectedDate, onSelectNavatar, onOverlayClick }) => {
    const [search, setSearch] = useState("");
    const [filtered, setFiltered] = useState([]);

    useEffect(() => {
        const lower = search.toLowerCase();
        setFiltered(
            navatars.filter((n) => n.location.toLowerCase().includes(lower))
        );
    }, [search, navatars]);

    if (!isNavatarSelectorOpen || !selectedDate) return null;

    return (
        <div className="modal-overlay navatar" onClick={onOverlayClick}>

            <div className="navatar-container">
                <div className="modal-head">
                    <p>Select Navatars for {selectedDate.toDateString()}</p><div className="modal">
                        <button className="btn btn-danger" onClick={onOverlayClick}>X</button>
                    </div>
                </div>
                <input
                    type="text"
                    placeholder="Search by location..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="search-input"
                />
                <div className="card-grid">
                    {filtered.length > 0 ? (
                        filtered.map((navatar) => (
                            <div
                                key={navatar.navatar_id}
                                className="card"
                                onClick={() => onSelectNavatar(navatar)}
                                style={{ cursor: "pointer" }}
                            >
                                <h3>{navatar.navatar_name}</h3>
                                <p><strong>Location:</strong> {navatar.location}</p>
                            </div>

                        ))
                    ) : (
                        <p>No navatars found.</p>
                    )}
                </div>

            </div>
        </div >
    );
};

export default NavatarList;
