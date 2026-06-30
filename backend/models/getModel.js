import UserAccount from "./UserAccount.js";
import HostAccount from "./HostAccount.js";
import AdminAccount from "./AdminAccount.js";
import VolunteerAccount from "./VolunteerAccount.js";

/**
 * Returns the correct Mongoose model for the given role.
 * Each role maps to a separate MongoDB collection:
 *   user      → planit_users
 *   host      → planit_hosts
 *   admin     → planit_admins
 *   volunteer → planit_volunteers
 */
export function getModelByRole(role) {
  switch (role) {
    case "host":      return HostAccount;
    case "admin":     return AdminAccount;
    case "volunteer": return VolunteerAccount;
    default:          return UserAccount;
  }
}
