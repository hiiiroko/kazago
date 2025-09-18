// Common helper functions and constants
const SEAT_MAP = {
  n1: { 
    from: [101699605, 'N1001'], 
    to: [101699932, 'N1328'],
    example: "N1001,N1002"
  },
  n2: { 
    from: [101699933, 'N2001'], 
    to: [101700080, 'N2148'],
    example: "N2001,N2002"
  },
  k2: { 
    from: [101700081, 'K2001'], 
    to: [101700176, 'K2096'],
    example: "K2001,K2002"
  }
};

// Parse user input string into an array of seat names (split by commas, spaces, etc.)
function parseSeatInput(str){
  if(!str) return [];
  // Use Set to remove duplicates
  return [...new Set(
    str.split(/[,，;；\s]+/)
      .map(s => s.trim().toUpperCase())
      .filter(Boolean)
  )];
}

// Build a complete seat list: preferred seats first, then the rest in order
function buildSeatList(area, prefs){
  const range = SEAT_MAP[area];
  const startId = range.from[0], startName = range.from[1];
  const endId   = range.to[0];
  const prefIds = prefs.map(name=>{
    // Determine base number based on area (n1:1001, n2/k2:2001)
    let baseNum;
    if (area === 'n1') {
      baseNum = 1001;
    } else if (area === 'n2' || area === 'k2') {
      baseNum = 2001;
    } else {
      baseNum = 1001; // default to prevent errors
    }
    const num = parseInt(name.substr(1)); // extract number part (e.g., 2001 from N2001)
    const offset = num - baseNum;
    return startId + offset;
  });
  const full = [];
  // Use Set to ensure no duplicates in prefIds
  [...new Set(prefIds)].forEach(id => full.push(id));
  for(let id=startId; id<=endId; id++){
    if(!prefIds.includes(id)) full.push(id);
  }
  return full;
}

// Format date to 'YYYY-MM-DD HH:mm' string
function fmtTime(d){
  const pad=n=>n.toString().padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Format time to 'HHmm' string
function fmtHM(d){
  const pad=n=>n.toString().padStart(2,'0');
  return `${pad(d.getHours())}${pad(d.getMinutes())}`;
}

// Get opening hours for a given date: full day (7:30-22:00) except Friday (7:30-14:00)
function getDayOpenRange(date){
  const day = date.getDay(); // 0=Sun
  // Correction: Friday hours are [07:30, 14:00]
  return day === 5 ? { open:[7,30], close:[14,0] } : { open:[7,30], close:[22,0] };
}

// Validate time parameters: duration between 1 and 14 hours, within opening hours
function isParamOk(mode, usageDay, startHM, endHM){
  const [sh,sm] = [parseInt(startHM.substr(0,2)), parseInt(startHM.substr(2,2))];
  const [eh,em] = [parseInt(endHM.substr(0,2)), parseInt(endHM.substr(2,2))];
  const range = getDayOpenRange(usageDay);
  const openMin = range.open[0]*60 + range.open[1];
  const closeMin = range.close[0]*60 + range.close[1];
  const startMin = sh*60 + sm;
  const endMin   = eh*60 + em;
  if(startMin>=endMin || startMin<openMin || endMin>closeMin) return false;
  const dur = (endMin-startMin)/60;
  return dur>=1 && dur<=14;
}

// Validate seat names: check format and range based on area
function validateSeats(area, seats){
  if(seats.length === 0) return true;
  
  const range = SEAT_MAP[area];
  const startName = range.from[1];
  const prefix = startName[0];
  const startNum = parseInt(startName.substr(1));
  const endNum = parseInt(range.to[1].substr(1));
  
  return seats.every(seat => {
    if(!seat.match(/^[KN]\d{4}$/)) return false;
    
    const seatPrefix = seat[0];
    const seatNum = parseInt(seat.substr(1));
    
    return seatPrefix === prefix && 
           seatNum >= startNum && 
           seatNum <= endNum;
  });
}

// Convert seat ID to seat name (e.g., 101699933 -> N2001)
function seatIdToName(seatId) {
  for (const [area, config] of Object.entries(SEAT_MAP)) {
    const [startId, startName] = config.from;
    const endId = config.to[0];
    if (seatId >= startId && seatId <= endId) {
      const offset = seatId - startId;
      const prefix = startName[0];
      const baseNum = parseInt(startName.substr(1));
      const seatNum = baseNum + offset;
      return `${prefix}${seatNum}`;
    }
  }
  return `ID${seatId}`;
}