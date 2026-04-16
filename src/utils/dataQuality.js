const validateTransactionRecord = (record) => {
    if (!record.transactionId || !record.amount || !record.date) {
        return false;
    }
    if (isNaN(parseFloat(record.amount))) {
        return false;
    }
    if (isNaN(Date.parse(record.date))) {
        return false;
    }
    return true;
};

module.exports = { validateTransactionRecord };
