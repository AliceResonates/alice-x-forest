const fs = require('fs');
const path = require('path');
const DATA_FILE = path.join(__dirname, 'data.json');

function load() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { orderMeta: {}, verifiedProfiles: {} };
  }
}

function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function getOrderMeta() {
  const d = load();
  return d.orderMeta || {};
}

function setOrderMeta(orderId, meta) {
  const d = load();
  d.orderMeta = d.orderMeta || {};
  d.orderMeta[orderId] = meta;
  save(d);
}

function getVerifiedProfiles() {
  const d = load();
  return d.verifiedProfiles || {};
}

function setVerifiedProfile(profileId, info) {
  const d = load();
  d.verifiedProfiles = d.verifiedProfiles || {};
  d.verifiedProfiles[profileId] = info;
  save(d);
}

module.exports = { load, save, getOrderMeta, setOrderMeta, getVerifiedProfiles, setVerifiedProfile };
