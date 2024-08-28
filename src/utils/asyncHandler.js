// PROMISES CODE ----
const asyncHandler = (requestHandler) => {
  // we accepted a function
  return (req, res, next) => {
    // we returned a function
    Promise
        .resolve(requestHandler(req, res, next))
        .catch((err) => next(err));
  };
};

export { asyncHandler };

// ASYNC AWAIT CODE ----

// asyncHandler is a higher order function
// function that accepts other functions as a parameter and can also return them
// basically they treat other functions as variables

//HIGER ORDER FUNCTIONS ARE EXECUTED LIKE THIS
//const asyncHandler = () => {}
//const asyncHandler = (func) => {() => {}}
//const asyncHandler = (func) => async () => {}

// to immediately call a function that was accepted as a parameter
// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }
