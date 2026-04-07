module.exports = async function appendMcp() {
  return {
    event: "mcp_call",
    captureOutputPath: "__CAPTURE_OUTPUT_PATH__"
  };
};
