module.exports = async function appendThought() {
  return {
    event: "assistant_thought",
    captureOutputPath: "__CAPTURE_OUTPUT_PATH__"
  };
};
