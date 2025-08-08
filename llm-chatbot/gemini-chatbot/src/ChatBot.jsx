import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { readPDF, readTextFile, readDocx } from "./fileutils";

// Backend API endpoint - Update this with your deployed backend URL
const BACKEND_URL = process.env.NODE_ENV === "production" 
  ? "https://your-backend-url.vercel.app"  // Replace with your actual backend URL
  : "http://localhost:8000";

function ChatBot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [context, setContext] = useState("");
  const [contextPreview, setContextPreview] = useState("");
  const [fileName, setFileName] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userInput = context ? `${context}\n\n${input}` : input;
    console.log("Sending message with context length:", context ? context.length : 0);
    console.log("User input:", input);
    console.log("Full prompt length:", userInput.length);
    
    setMessages((prev) => [...prev, { role: "user", text: input }]);
    setInput("");
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Send to backend instead of direct Gemini
      const response = await axios.post(`${BACKEND_URL}/query`, {
        prompt: userInput,
      });
      const botResponse = response.data.response || response.data.error || "No response";

      setMessages((prev) => [...prev, { role: "bot", text: botResponse }]);
    } catch (err) {
      console.error("Backend error:", err);
      const errorMsg = err.response?.data?.error || err.message || "Connection error";
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: `❌ Backend error: ${errorMsg}` },
      ]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log("File selected:", file.name, file.type);
    setSelectedFile(file);
    
    // Try to process all files immediately, including PDFs
    console.log("Processing file immediately");
    await processFile(file);
  };

  const processFile = async (file, filePassword = "") => {
    console.log("Processing file:", file.name, "with password:", filePassword ? "yes" : "no");
    
    // Fallback to extension when MIME type is missing or generic
    const lowerName = (file.name || "").toLowerCase();
    const mime = (file.type || "").toLowerCase();

    let fileText = "";
    try {
      if (mime === "application/pdf" || lowerName.endsWith(".pdf")) {
        console.log("Reading PDF file");
        fileText = await readPDF(file, filePassword);
        console.log("PDF text length:", fileText.length);
      } else if (
        mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        lowerName.endsWith(".docx")
      ) {
        console.log("Reading DOCX file");
        fileText = await readDocx(file);
      } else if (mime.startsWith("text/") || lowerName.endsWith(".txt")) {
        console.log("Reading text file");
        fileText = await readTextFile(file);
      } else {
        throw new Error("Unsupported file type. Please upload PDF, DOCX, or TXT.");
      }
    } catch (ex) {
      console.error("File parse error:", ex);
      const errorMsg = ex.message || "Unknown error";
      
      // Show password input if it's a PDF and the error mentions password
      if (errorMsg.includes("password") && filePassword === "" && lowerName.endsWith(".pdf")) {
        console.log("PDF requires password, showing password input");
        setShowPasswordInput(true);
        setMessages((prev) => [
          ...prev,
          { role: "bot", text: `🔒 This PDF requires a password. Please enter it above and click 'Process File'.` },
        ]);
        return;
      }
      
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: `❌ File processing error: ${errorMsg}` },
      ]);
      return;
    }

    if (fileText.trim()) {
      setContext(fileText);
      setContextPreview(fileText.substring(0, 400));
      setFileName(file.name);
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: `✅ Successfully loaded "${file.name}" (${fileText.length} characters). You can now ask questions about this document!` },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: `⚠️ The file "${file.name}" appears to be empty or couldn't be processed.` },
      ]);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!password.trim()) return;
    await processFile(selectedFile, password);
    setShowPasswordInput(false);
    setPassword("");
  };

  const showPasswordInputField = () => {
    setShowPasswordInput(true);
  };

  const clearContext = () => {
    setContext("");
    setContextPreview("");
    setFileName("");
    setSelectedFile(null);
    setMessages((prev) => [
      ...prev,
      { role: "bot", text: "🧹 Context cleared. You can upload a new document." },
    ]);
  };

  return (
    <div style={{
      minHeight: "100vh",
      width: "100vw",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
      padding: "0",
      margin: "0",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      boxSizing: "border-box",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Animated Background Elements */}
      <div style={{
        position: "fixed",
        top: "0",
        left: "0",
        right: "0",
        bottom: "0",
        background: "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><defs><pattern id=\"grain\" width=\"100\" height=\"100\" patternUnits=\"userSpaceOnUse\"><circle cx=\"50\" cy=\"50\" r=\"1\" fill=\"rgba(255,255,255,0.1)\"/></pattern></defs><rect width=\"100\" height=\"100\" fill=\"url(%23grain)\"/></svg>')",
        pointerEvents: "none",
        zIndex: "-1"
      }} />
      
      <div style={{
        width: "100%",
        maxWidth: "100%",
        margin: "0",
        background: "rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(20px)",
        borderRadius: "0",
        boxShadow: "0 25px 50px rgba(0, 0, 0, 0.1)",
        overflow: "hidden",
        minHeight: "100vh",
        border: "1px solid rgba(255, 255, 255, 0.2)"
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%)",
          backdropFilter: "blur(30px)",
          color: "white",
          padding: "40px 30px",
          textAlign: "center",
          position: "relative",
          borderBottom: "1px solid rgba(255, 255, 255, 0.2)"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "20px",
            marginBottom: "15px"
          }}>
            <div style={{
              fontSize: "3.5rem",
              animation: "float 3s ease-in-out infinite",
              filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.3))"
            }}>
              🤖
            </div>
            <h1 style={{
              margin: "0",
              fontSize: "3.5rem",
              fontWeight: "800",
              background: "linear-gradient(135deg, #fff 0%, #f0f0f0 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "0 4px 8px rgba(0,0,0,0.3)",
              letterSpacing: "-0.02em"
            }}>
              LLM Chatbot
            </h1>
          </div>
          <p style={{
            margin: "10px 0 0 0",
            opacity: "0.9",
            fontSize: "1.3rem",
            fontWeight: "500",
            textShadow: "0 2px 4px rgba(0,0,0,0.2)"
          }}>
            Upload documents and chat with advanced AI intelligence
          </p>
        </div>

        {/* Main Content */}
        <div style={{ padding: "40px", maxWidth: "1400px", margin: "0 auto" }}>
          {/* File Upload Section */}
          <div style={{
            background: "rgba(255, 255, 255, 0.95)",
            borderRadius: "25px",
            padding: "35px",
            marginBottom: "30px",
            border: "2px dashed rgba(102, 126, 234, 0.3)",
            transition: "all 0.4s ease",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
            backdropFilter: "blur(20px)",
            position: "relative",
            overflow: "hidden"
          }}>
            <div style={{
              position: "absolute",
              top: "0",
              left: "0",
              right: "0",
              height: "4px",
              background: "linear-gradient(90deg, #667eea, #764ba2, #f093fb)",
              borderRadius: "25px 25px 0 0"
            }} />
            
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              flexWrap: "wrap"
            }}>
              <div style={{
                flex: "1",
                minWidth: "300px",
                position: "relative"
              }}>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  style={{
                    width: "100%",
                    padding: "20px",
                    border: "3px solid rgba(102, 126, 234, 0.2)",
                    borderRadius: "20px",
                    fontSize: "16px",
                    background: "rgba(255, 255, 255, 0.9)",
                    transition: "all 0.3s ease",
                    cursor: "pointer"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#667eea";
                    e.target.style.boxShadow = "0 0 0 4px rgba(102, 126, 234, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(102, 126, 234, 0.2)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
              {selectedFile && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "15px",
                  padding: "15px 25px",
                  background: "linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))",
                  borderRadius: "20px",
                  border: "2px solid rgba(102, 126, 234, 0.3)",
                  animation: "slideIn 0.5s ease-out"
                }}>
                  <span style={{ fontSize: "24px" }}>📄</span>
                  <span style={{ 
                    fontSize: "16px", 
                    color: "#667eea",
                    fontWeight: "600"
                  }}>
                    {selectedFile.name.length > 30 ? selectedFile.name.substring(0, 30) + "..." : selectedFile.name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Password Input Section */}
          {selectedFile && !showPasswordInput && !context && (
            <div style={{
              background: "linear-gradient(135deg, rgba(255, 193, 7, 0.1), rgba(255, 152, 0, 0.1))",
              border: "2px solid rgba(255, 193, 7, 0.3)",
              borderRadius: "25px",
              padding: "30px",
              marginBottom: "30px",
              animation: "slideIn 0.5s ease-out",
              backdropFilter: "blur(10px)"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "20px",
                flexWrap: "wrap"
              }}>
                <div style={{ flex: "1" }}>
                  <strong style={{ 
                    color: "#f57c00", 
                    fontSize: "18px",
                    display: "block",
                    marginBottom: "10px"
                  }}>
                    📄 File Selected:
                  </strong>
                  <div style={{ 
                    color: "#f57c00", 
                    fontSize: "16px",
                    fontWeight: "500"
                  }}>
                    {selectedFile.name}
                  </div>
                </div>
                <button
                  onClick={showPasswordInputField}
                  style={{
                    padding: "15px 30px",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "15px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "600",
                    transition: "all 0.3s ease",
                    boxShadow: "0 8px 25px rgba(102, 126, 234, 0.4)"
                  }}
                  onMouseOver={(e) => e.target.style.transform = "translateY(-3px) scale(1.02)"}
                  onMouseOut={(e) => e.target.style.transform = "translateY(0) scale(1)"}
                >
                  🔒 Enter Password
                </button>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPassword("");
                  }}
                  style={{
                    padding: "15px 30px",
                    background: "linear-gradient(135deg, #6c757d 0%, #495057 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "15px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "600",
                    transition: "all 0.3s ease",
                    boxShadow: "0 8px 25px rgba(108, 117, 125, 0.4)"
                  }}
                  onMouseOver={(e) => e.target.style.transform = "translateY(-3px) scale(1.02)"}
                  onMouseOut={(e) => e.target.style.transform = "translateY(0) scale(1)"}
                >
                  ❌ Cancel
                </button>
              </div>
            </div>
          )}

          {/* Password Input Field */}
          {showPasswordInput && selectedFile && (
            <div style={{
              background: "linear-gradient(135deg, rgba(255, 193, 7, 0.1), rgba(255, 152, 0, 0.1))",
              border: "2px solid rgba(255, 193, 7, 0.3)",
              borderRadius: "25px",
              padding: "35px",
              marginBottom: "30px",
              animation: "slideIn 0.5s ease-out",
              backdropFilter: "blur(10px)"
            }}>
              <div style={{ marginBottom: "20px" }}>
                <strong style={{ 
                  color: "#f57c00", 
                  fontSize: "20px",
                  display: "block"
                }}>
                  🔒 Password Required: {selectedFile.name}
                </strong>
              </div>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "20px",
                flexWrap: "wrap"
              }}>
                <input
                  type="password"
                  placeholder="Enter PDF password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    flex: "1",
                    minWidth: "300px",
                    padding: "20px",
                    border: "3px solid rgba(255, 193, 7, 0.3)",
                    borderRadius: "15px",
                    fontSize: "16px",
                    background: "rgba(255, 255, 255, 0.9)",
                    transition: "all 0.3s ease"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#ffc107";
                    e.target.style.boxShadow = "0 0 0 4px rgba(255, 193, 7, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255, 193, 7, 0.3)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  onClick={handlePasswordSubmit}
                  style={{
                    padding: "20px 35px",
                    background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "15px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "600",
                    transition: "all 0.3s ease",
                    boxShadow: "0 8px 25px rgba(40, 167, 69, 0.4)"
                  }}
                  onMouseOver={(e) => e.target.style.transform = "translateY(-3px) scale(1.02)"}
                  onMouseOut={(e) => e.target.style.transform = "translateY(0) scale(1)"}
                >
                  ✅ Process File
                </button>
                <button
                  onClick={() => {
                    setShowPasswordInput(false);
                    setSelectedFile(null);
                    setPassword("");
                  }}
                  style={{
                    padding: "20px 35px",
                    background: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "15px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "600",
                    transition: "all 0.3s ease",
                    boxShadow: "0 8px 25px rgba(220, 53, 69, 0.4)"
                  }}
                  onMouseOver={(e) => e.target.style.transform = "translateY(-3px) scale(1.02)"}
                  onMouseOut={(e) => e.target.style.transform = "translateY(0) scale(1)"}
                >
                  ❌ Cancel
                </button>
              </div>
            </div>
          )}

          {/* Context Display */}
          {context && (
            <div style={{
              background: "linear-gradient(135deg, rgba(40, 167, 69, 0.1), rgba(32, 201, 151, 0.1))",
              border: "2px solid rgba(40, 167, 69, 0.3)",
              borderRadius: "25px",
              padding: "30px",
              marginBottom: "30px",
              animation: "slideIn 0.5s ease-out",
              backdropFilter: "blur(10px)"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
                flexWrap: "wrap",
                gap: "15px"
              }}>
                <div>
                  <strong style={{ 
                    color: "#155724", 
                    fontSize: "20px",
                    display: "block",
                    marginBottom: "8px"
                  }}>
                    📄 Context Loaded: {fileName}
                  </strong>
                  <div style={{ 
                    color: "#155724", 
                    fontSize: "16px",
                    fontWeight: "500"
                  }}>
                    {context.length.toLocaleString()} characters loaded
                  </div>
                </div>
                <button
                  onClick={clearContext}
                  style={{
                    padding: "12px 25px",
                    background: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    transition: "all 0.3s ease",
                    boxShadow: "0 6px 20px rgba(220, 53, 69, 0.4)"
                  }}
                  onMouseOver={(e) => e.target.style.transform = "translateY(-2px) scale(1.05)"}
                  onMouseOut={(e) => e.target.style.transform = "translateY(0) scale(1)"}
                >
                  🧹 Clear Context
                </button>
              </div>
              <div style={{
                background: "rgba(255, 255, 255, 0.9)",
                padding: "20px",
                borderRadius: "15px",
                border: "2px solid rgba(40, 167, 69, 0.2)",
                maxHeight: "200px",
                overflow: "auto",
                fontSize: "14px",
                lineHeight: "1.6",
                color: "#155724",
                backdropFilter: "blur(10px)"
              }}>
                {contextPreview}{context.length > 400 ? "…" : ""}
              </div>
            </div>
          )}

          {/* Chat Window */}
          <div style={{
            background: "rgba(255, 255, 255, 0.95)",
            borderRadius: "30px",
            border: "2px solid rgba(255, 255, 255, 0.3)",
            overflow: "hidden",
            marginBottom: "30px",
            minHeight: context ? "500px" : "200px",
            maxHeight: context ? "600px" : "300px",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 25px 50px rgba(0, 0, 0, 0.15)",
            backdropFilter: "blur(20px)",
            position: "relative"
          }}>
            <div style={{
              position: "absolute",
              top: "0",
              left: "0",
              right: "0",
              height: "4px",
              background: "linear-gradient(90deg, #667eea, #764ba2, #f093fb)",
              borderRadius: "30px 30px 0 0"
            }} />
            
            <div style={{
              background: "linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))",
              color: "#333",
              padding: "25px",
              textAlign: "center",
              fontWeight: "700",
              fontSize: "22px",
              borderBottom: "1px solid rgba(0, 0, 0, 0.1)"
            }}>
              💬 AI Conversation
            </div>
                         <div style={{
               flex: "1",
               padding: "30px",
               overflowY: "auto",
               maxHeight: context ? "400px" : "150px",
               background: "rgba(248, 249, 250, 0.8)",
               scrollBehavior: "smooth"
             }}>
              {messages.length === 0 ? (
                                 <div style={{
                   textAlign: "center",
                   color: "#6c757d",
                   fontSize: "16px",
                   marginTop: "20px",
                   padding: "20px"
                 }}>
                                     <div style={{
                     fontSize: "2.5rem",
                     marginBottom: "10px",
                     animation: "bounce 2s infinite"
                   }}>
                     👋
                   </div>
                                     <div style={{
                     fontSize: "20px",
                     fontWeight: "600",
                     marginBottom: "10px",
                     color: "#333"
                   }}>
                     Welcome to LLM Chatbot!
                   </div>
                   <div style={{
                     fontSize: "14px",
                     lineHeight: "1.5",
                     color: "#666",
                     maxWidth: "400px",
                     margin: "0 auto"
                   }}>
                     Upload a document above to start chatting with AI intelligence.
                   </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      marginBottom: "25px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: m.role === "user" ? "flex-end" : "flex-start",
                      animation: "slideIn 0.4s ease-out"
                    }}
                  >
                    <div style={{
                      maxWidth: "85%",
                      padding: "20px 25px",
                      borderRadius: "25px",
                      background: m.role === "user" 
                        ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" 
                        : "rgba(255, 255, 255, 0.95)",
                      color: m.role === "user" ? "white" : "#333",
                      fontSize: "16px",
                      lineHeight: "1.6",
                      wordWrap: "break-word",
                      boxShadow: m.role === "user" 
                        ? "0 8px 25px rgba(102, 126, 234, 0.3)" 
                        : "0 8px 25px rgba(0, 0, 0, 0.1)",
                      border: m.role === "user" ? "none" : "1px solid rgba(0, 0, 0, 0.1)",
                      backdropFilter: "blur(10px)",
                      position: "relative"
                    }}>
                      <div style={{
                        fontWeight: "700",
                        marginBottom: "8px",
                        fontSize: "14px",
                        opacity: "0.9",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}>
                        {m.role === "user" ? "👤 You" : "🤖 Gemini AI"}
                      </div>
                      <div style={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word"
                      }}>
                        {m.text}
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {/* Typing Indicator */}
              {isTyping && (
                <div style={{
                  marginBottom: "25px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start"
                }}>
                  <div style={{
                    maxWidth: "85%",
                    padding: "20px 25px",
                    borderRadius: "25px",
                    background: "rgba(255, 255, 255, 0.95)",
                    boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)",
                    border: "1px solid rgba(0, 0, 0, 0.1)",
                    backdropFilter: "blur(10px)"
                  }}>
                    <div style={{
                      fontWeight: "700",
                      marginBottom: "8px",
                      fontSize: "14px",
                      opacity: "0.9",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}>
                      🤖 Gemini AI
                    </div>
                    <div style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center"
                    }}>
                      <div style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#667eea",
                        animation: "typing 1.4s infinite ease-in-out"
                      }} />
                      <div style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#667eea",
                        animation: "typing 1.4s infinite ease-in-out",
                        animationDelay: "0.2s"
                      }} />
                      <div style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#667eea",
                        animation: "typing 1.4s infinite ease-in-out",
                        animationDelay: "0.4s"
                      }} />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Message Input */}
          <div style={{
            display: "flex",
            gap: "20px",
            alignItems: "center",
            flexWrap: "wrap",
            background: "rgba(255, 255, 255, 0.95)",
            borderRadius: "25px",
            padding: "30px",
            boxShadow: "0 25px 50px rgba(0, 0, 0, 0.1)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            position: "relative"
          }}>
            <div style={{
              position: "absolute",
              top: "0",
              left: "0",
              right: "0",
              height: "3px",
              background: "linear-gradient(90deg, #667eea, #764ba2, #f093fb)",
              borderRadius: "25px 25px 0 0"
            }} />
            
            <input
              type="text"
              placeholder="Ask something about your document..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              style={{
                flex: "1",
                minWidth: "400px",
                padding: "20px 25px",
                border: "3px solid rgba(102, 126, 234, 0.2)",
                borderRadius: "20px",
                fontSize: "18px",
                background: "rgba(255, 255, 255, 0.9)",
                color: "#333",
                transition: "all 0.3s ease",
                outline: "none"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#667eea";
                e.target.style.boxShadow = "0 0 0 4px rgba(102, 126, 234, 0.1)";
                e.target.style.transform = "translateY(-2px)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(102, 126, 234, 0.2)";
                e.target.style.boxShadow = "none";
                e.target.style.transform = "translateY(0)";
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              style={{
                padding: "20px 35px",
                background: input.trim() && !isLoading
                  ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" 
                  : "linear-gradient(135deg, #6c757d 0%, #495057 100%)",
                color: "white",
                border: "none",
                borderRadius: "20px",
                cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
                fontSize: "18px",
                fontWeight: "700",
                transition: "all 0.3s ease",
                boxShadow: input.trim() && !isLoading 
                  ? "0 8px 25px rgba(102, 126, 234, 0.4)" 
                  : "0 4px 10px rgba(0, 0, 0, 0.1)",
                minWidth: "120px"
              }}
              onMouseOver={(e) => {
                if (input.trim() && !isLoading) {
                  e.target.style.transform = "translateY(-3px) scale(1.02)";
                }
              }}
              onMouseOut={(e) => {
                e.target.style.transform = "translateY(0) scale(1)";
              }}
            >
              {isLoading ? "⏳" : "📤 Send"}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(5deg); }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0) scale(1); }
          40% { transform: translateY(-15px) scale(1.1); }
          60% { transform: translateY(-7px) scale(1.05); }
        }
        
        @keyframes typing {
          0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default ChatBot;
