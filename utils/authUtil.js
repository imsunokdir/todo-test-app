const isEmailValidate = ({ key }) => {
  const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/; // Correct email regex pattern
  return emailRegex.test(key); // Test if the email matches the regex pattern
};

const userDataValidation = ({ name, email, username, password }) => {
  return new Promise((resolve, reject) => {
    console.log(name, email, password, username);
    if (!email) reject("email is missing");
    if (!password) reject("password is missing");
    if (!username) reject("username is missing");

    if (typeof name !== "string") reject("name is not a text");
    if (typeof email !== "string") reject("email is not a text");
    if (typeof username !== "string") reject("username is not a text");
    if (typeof password !== "string") reject("password is not a text");

    //do email validaiton here
    // if(!isEmailValidate({key:email}))
    resolve();
  });
};

module.exports = { userDataValidation, isEmailValidate };
