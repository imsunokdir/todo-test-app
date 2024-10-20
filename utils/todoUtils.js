const todoDataValidation = ({ todo }) => {
  return new Promise((resolve, reject) => {
    if (!todo) return reject("todo is missing");
    if (typeof todo !== "string") reject("todo is not a text/string");
    if (todo.length < 3 || todo.length > 100)
      reject("Todo length should be 3-100 chars only");
    resolve();
  });
};

module.exports = todoDataValidation;
