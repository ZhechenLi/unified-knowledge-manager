module.exports = async function appendFileRead() {
  return {
    event: "file_read",
    captureOutputPath: "__CAPTURE_OUTPUT_PATH__"
  };
};
