logger.debug("| SV | GET | APP | TCI STATE | (User ID Duplication Requested) or (User ID Availability Confirmed) or (Half-USN Allocated) or (USN Allocated)");
logger.debug("| SV | SET | APP | TCI STATE | (  ^  ) -> (IDLE)");
logger.debug("| SV | PACK| APP | SDP:SGU-REQ");
logger.debug(`| SV | SEND| REQ | SDP:SGU-REQ | ${JSON.stringify(protocol.getPackedMsg())}`);
logger.debug("| SV | SET | APP | TCI STATE | (IDLE) -> (User ID Duplicate Request)");
logger.debug("| SV | RCVD| RSP | SDP:SGU-RSP");
logger.debug("| SV | VRFY| HDR | SDP:SGU-RSP");
logger.debug("| SV | UNPK| PYLD| SDP:SGU-RSP");
logger.debug("| SV | GET | APP | TCI STATE | Available");
logger.debug("| SV | GEN | CODE| Get VC, AC code");
logger.debug(`| SV | SEND| MAIL| Send Verification Email | VC:${vc} | AC: ${ac}`);
logger.debug(`| SV | STOR| APP | Temporary user sign-up information | Expire in: ${expTime} | Data:  ${JSON.stringify(userInfo)}`);
logger.debug(`| SV | PACK| APP | SAP: SGU-RSP`);
logger.debug("| SV | SET | APP | TCI STATE | (User ID Duplicate Requested) -> (User ID Availability Confirmed)");
logger.debug(`| SV | SEND| REQ | SDP:SGU-RSP | ${JSON.stringify(protocol.getPackedMsg())}`);


logger.debug("      | DB | SET | APP | TCI STATE | (Null) -> (Idle)");
logger.debug("      | DB | SET | WEB | TCI STATE | (Null) -> (Idle)");
logger.debug("      | DB | PACK| APP | SDP:SGU-RSP");
logger.debug(`      | DB | SET | WEB | TCI STATE | (Idle) -> (Unique User ID Confirmed)`);
logger.debug(`      | DB | SEND| REQ | SDP:SGU-RSP | ${JSON.stringify(protocol.getPackedMsg())}`);