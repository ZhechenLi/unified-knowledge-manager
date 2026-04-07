module.exports = async function appendEdit() {
  return {
    event: "file_edit",
    captureOutputPath: "__CAPTURE_OUTPUT_PATH__"
  };
};
