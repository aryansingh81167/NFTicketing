export const TICKET_NFT_ABI = [
  "function eventName() view returns (string)",
  "function eventDate() view returns (string)",
  "function ticketPrice() view returns (uint256)",
  "function maxTickets() view returns (uint256)",
  "function nextTokenId() view returns (uint256)",
  "function usedTickets(uint256) view returns (bool)",
  "function buyTicket() payable",
  "function useTicket(uint256 tokenId)",
  "function isValid(uint256 tokenId) view returns (bool)",
  "function getEventDetails() view returns (string, string, uint256, uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)"
];

export const CONTRACT_ADDRESS = "0xdbc0B39bf5b71e81E733E81f4A68c4024CC259B4";
