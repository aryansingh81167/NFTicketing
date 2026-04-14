import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Ticket, CheckCircle2, XCircle, Loader2, Calendar, Tag, ShieldCheck, Zap } from 'lucide-react';
import { TICKET_NFT_ABI, CONTRACT_ADDRESS } from './contract';

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [address, setAddress] = useState(null);
  const [contract, setContract] = useState(null);

  const [eventDetails, setEventDetails] = useState(null);
  const [soldTickets, setSoldTickets] = useState("0");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const [useTicketId, setUseTicketId] = useState("");
  const [verifyTicketId, setVerifyTicketId] = useState("");
  const [verifyResult, setVerifyResult] = useState(null); // true, false, or null

  const [ownerCheckId, setOwnerCheckId] = useState("");
  const [ownerResult, setOwnerResult] = useState("");

  // Initialize provider and load contract details
  useEffect(() => {
    const init = async () => {
      // Connect to window.ethereum if available, but read-only even without connect
      let currentContract;

      // 🔥 Use Infura RPC for fast reads
      const rpcProvider = new ethers.JsonRpcProvider(
        "https://sepolia.infura.io/v3/b435f57b6bf447d89554daabe91213dc"
      );

      currentContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        TICKET_NFT_ABI,
        rpcProvider
      );

      // Keep MetaMask for wallet connection only
      if (window.ethereum) {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(browserProvider);
      }

      setContract(currentContract);
      await fetchEventDetails(currentContract);
    };

    init();
  }, []);

  const fetchEventDetails = async (contractInstance) => {
    if (!contractInstance) return;
    try {
      const [name, date, price, max] = await contractInstance.getEventDetails();
      const currentSold = await contractInstance.nextTokenId();

      setEventDetails({
        name,
        date,
        price: ethers.formatEther(price),
        max: max.toString()
      });
      setSoldTickets(currentSold.toString());
    } catch (err) {
      console.error("Error fetching event details - using fallback dummy data", err);
      // Fallback data when contract is not yet deployed
      setEventDetails({
        name: "College Fest 2026",
        date: "10 May 2026",
        price: "0.01",
        max: "100"
      });
      setSoldTickets("12");
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      showMessage("Please install MetaMask!", "error");
      return;
    }

    try {
      setLoading(true);
      const prov = new ethers.BrowserProvider(window.ethereum);

      // Request account access
      await prov.send("eth_requestAccounts", []);

      // Check network - optional but good for sepola
      const network = await prov.getNetwork();
      if (network.chainId !== 11155111n) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }], // Sepolia chain ID
          });
        } catch (switchError) {
          showMessage("Please switch to Sepolia network in MetaMask.", "error");
          setLoading(false);
          return;
        }
      }

      const currentSigner = await prov.getSigner();
      const currentAddress = await currentSigner.getAddress();

      setProvider(prov);
      setSigner(currentSigner);
      setAddress(currentAddress);

      const signerContract = new ethers.Contract(CONTRACT_ADDRESS, TICKET_NFT_ABI, currentSigner);
      setContract(signerContract);

      showMessage("Wallet connected successfully!", "success");
    } catch (err) {
      console.error(err);
      showMessage("Failed to connect wallet", "error");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  };

  const buyTicket = async () => {
    if (!signer || !contract) {
      showMessage("Please connect your wallet first", "error");
      return;
    }

    try {
      setLoading(true);
      showMessage("Initiating transaction...", "info");

      const price = ethers.parseEther(eventDetails.price);
      const tx = await contract.buyTicket({ value: price });

      showMessage("Transaction submitted! Waiting for confirmation...", "info");
      await tx.wait();

      showMessage("Ticket purchased successfully!", "success");
      await fetchEventDetails(contract); // Refresh stats
    } catch (err) {
      console.error(err);
      showMessage(err.reason || "Transaction failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const useTicket = async () => {
    if (!signer || !contract) {
      showMessage("Please connect your wallet first", "error");
      return;
    }

    if (!useTicketId) {
      showMessage("Please enter a ticket ID", "error");
      return;
    }

    try {
      setLoading(true);
      showMessage("Verifying ownership and using ticket...", "info");

      const tx = await contract.useTicket(useTicketId);
      showMessage("Transaction submitted! Waiting for confirmation...", "info");

      await tx.wait();
      showMessage("Ticket used successfully!", "success");
      setUseTicketId("");
    } catch (err) {
      console.error(err);
      showMessage(err.reason || "Failed to use ticket", "error");
    } finally {
      setLoading(false);
    }
  };

  const verifyTicket = async () => {
    if (!contract || !verifyTicketId) {
      showMessage("Please enter a ticket ID", "error");
      return;
    }

    try {
      setLoading(true);
      const valid = await contract.isValid(verifyTicketId);
      setVerifyResult(valid);

      if (valid) {
        showMessage("Ticket is valid and unused!", "success");
      } else {
        showMessage("Ticket is invalid or has already been used.", "error");
      }
    } catch (err) {
      console.error(err);
      setVerifyResult(false);
      showMessage("Error verifying ticket", "error");
    } finally {
      setLoading(false);
    }
  };

  const checkOwner = async () => {
    if (!contract || !ownerCheckId) return;

    try {
      setLoading(true);
      const owner = await contract.ownerOf(ownerCheckId);
      setOwnerResult(owner);
    } catch (err) {
      console.error(err);
      setOwnerResult("Invalid ID or no owner");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (addr) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="min-h-screen relative overflow-hidden font-sans pb-20">
      {/* Animated background blobs */}
      <div className="bg-blur-circle bg-purple-600/30 w-[500px] h-[500px] top-[-100px] left-[-100px] animate-pulse"></div>
      <div className="bg-blur-circle bg-blue-600/20 w-[600px] h-[600px] bottom-[-200px] right-[-200px] animate-pulse" style={{ animationDelay: '2s' }}></div>

      {/* Header */}
      <header className="relative z-10 w-full px-6 py-4 flex justify-between items-center glass-card border-x-0 border-t-0 rounded-none mb-10">
        <div className="flex items-center gap-2">
          <Zap className="text-purple-400" size={28} />
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400 tracking-tight">
            NFTicketing
          </h1>
        </div>

        <button
          onClick={address ? null : connectWallet}
          className="glass-card flex items-center gap-2 px-4 py-2 rounded-full hover:bg-white/10 transition-colors border border-white/20"
        >
          <Wallet size={18} className="text-purple-400" />
          <span className="font-medium text-sm">
            {address ? formatAddress(address) : "Connect Wallet"}
          </span>
        </button>
      </header>

      {/* Messages / Notifications */}
      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-md px-4">
        <AnimatePresence>
          {message.text && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className={`p-4 rounded-xl shadow-2xl backdrop-blur-xl border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' :
                message.type === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-200' :
                  'bg-blue-500/10 border-blue-500/30 text-blue-200'
                } flex items-center gap-3`}
            >
              {message.type === 'success' && <CheckCircle2 size={20} className="shrink-0" />}
              {message.type === 'error' && <XCircle size={20} className="shrink-0" />}
              {message.type === 'info' && <Loader2 size={20} className="shrink-0 animate-spin" />}
              <span className="text-sm font-medium">{message.text}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <main className="max-w-6xl mx-auto px-4 z-10 relative grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column - Event Details & Minting */}
        <div className="lg:col-span-5 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-3xl p-8 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
              <Ticket size={120} />
            </div>

            <h2 className="text-3xl font-bold mb-6 text-white tracking-tight">Event Access</h2>

            {eventDetails ? (
              <div className="space-y-5">
                <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                    <Zap className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Event Name</p>
                    <p className="text-lg font-medium text-slate-100">{eventDetails.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                    <Calendar className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Date & Time</p>
                    <p className="text-lg font-medium text-slate-100">{eventDetails.date}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 pb-2">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Tag className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Ticket Price</p>
                    <p className="text-lg font-medium text-slate-100">{eventDetails.price} ETH</p>
                  </div>
                </div>



                <button
                  onClick={buyTicket}
                  disabled={loading || !eventDetails || parseInt(soldTickets) >= parseInt(eventDetails.max)}
                  className="w-full gradient-btn mt-6 py-4 text-lg font-semibold flex justify-center items-center gap-2 group"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <>
                      Buy Ticket Now <Ticket size={20} className="group-hover:rotate-12 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="animate-spin text-purple-500" size={32} />
                <p className="text-slate-400">Loading Event Details...</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Column - Actions */}
        <div className="lg:col-span-7 space-y-6">

          {/* Verify Ticket */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-3xl p-6 md:p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <ShieldCheck className="text-blue-400" size={28} />
              <h2 className="text-2xl font-bold text-white tracking-tight">Verify Ticket</h2>
            </div>
            <p className="text-slate-400 text-sm mb-6">Enter a Ticket ID to verify its validity and check if it has already been used.</p>

            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="number"
                min="1"
                placeholder="Ticket ID (e.g. 1)"
                value={verifyTicketId}
                onChange={(e) => {
                  setVerifyTicketId(e.target.value);
                  setVerifyResult(null);
                }}
                className="glass-input flex-1"
              />
              <button
                onClick={verifyTicket}
                disabled={loading || !verifyTicketId}
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium rounded-lg px-6 py-2 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : "Check Status"}
              </button>
            </div>

            <AnimatePresence>
              {verifyResult !== null && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-6 overflow-hidden"
                >
                  <div className={`p-4 rounded-xl border flex items-start gap-3 ${verifyResult ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'
                    }`}>
                    {verifyResult ? (
                      <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h3 className={`font-semibold ${verifyResult ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {verifyResult ? "Valid Ticket" : "Invalid Ticket"}
                      </h3>
                      <p className={`text-sm mt-1 ${verifyResult ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
                        {verifyResult
                          ? "This ticket is authentic and has not been used yet. It is valid for entry."
                          : "This ticket does not exist, or it has already been used. Not valid for entry."}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Use Ticket */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-3xl p-6 md:p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <Ticket className="text-purple-400" size={28} />
              <h2 className="text-2xl font-bold text-white tracking-tight">Use Ticket</h2>
            </div>
            <p className="text-slate-400 text-sm mb-6">Owner only: Consume your ticket to gain entry to the event. This action cannot be undone.</p>

            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="number"
                min="1"
                placeholder="Your Ticket ID"
                value={useTicketId}
                onChange={(e) => setUseTicketId(e.target.value)}
                className="glass-input flex-1"
              />
              <button
                onClick={useTicket}
                disabled={loading || !useTicketId}
                className="bg-white/10 hover:bg-rose-500/20 hover:border-rose-500/50 hover:text-rose-300 border border-white/20 text-white font-medium rounded-lg px-6 py-2 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : "Consume Ticket"}
              </button>
            </div>
          </motion.div>

          {/* Additional tools: Check Owner */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-3xl p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Ownership Lookup</h3>
            <div className="flex gap-4">
              <input
                type="number"
                min="1"
                placeholder="Ticket ID"
                value={ownerCheckId}
                onChange={(e) => {
                  setOwnerCheckId(e.target.value);
                  setOwnerResult("");
                }}
                className="glass-input flex-1 py-1 px-3 text-sm"
              />
              <button
                onClick={checkOwner}
                disabled={loading || !ownerCheckId}
                className="bg-white/5 hover:bg-white/10 text-white text-sm rounded-lg px-4 py-1 transition-all"
              >
                Lookup
              </button>
            </div>
            {ownerResult && (
              <p className="text-slate-400 text-sm mt-3 bg-black/20 p-2 rounded break-all">
                Owner: <span className="text-white">{ownerResult}</span>
              </p>
            )}
          </motion.div>

        </div>
      </main>
    </div>
  );
}

export default App;
