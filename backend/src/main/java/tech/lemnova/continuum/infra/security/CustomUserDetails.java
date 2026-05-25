package tech.lemnova.continuum.infra.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import tech.lemnova.continuum.domain.plan.PlanType;
import tech.lemnova.continuum.domain.user.User;

import java.util.Collection;
import java.util.List;

public class CustomUserDetails implements UserDetails {

    private final String userId;
    private final String displayName;
    private final String password;
    private final String email;
    private final String vaultId;
    private final boolean active;
    private final PlanType plan;
    private final Collection<? extends GrantedAuthority> authorities;

    public CustomUserDetails(User user) {
        this.userId      = user.getId();
        this.displayName = user.getUsername();
        this.password    = user.getPassword();
        this.email       = user.getEmail();
        this.vaultId     = user.getVaultId();
        this.active      = Boolean.TRUE.equals(user.getActive());
        this.plan        = user.getPlan();
        this.authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().toUpperCase()));
    }

    public String getUserId() { return userId; }
    public String getEmail()  { return email; }
    public String getVaultId() { return vaultId; }
    public PlanType getPlan() { return plan; }
    public String getDisplayName() { return displayName; }

    @Override public String getUsername()   { return email; }
    @Override public String getPassword()   { return password; }
    @Override public Collection<? extends GrantedAuthority> getAuthorities() { return authorities; }
    @Override public boolean isEnabled()    { return active; }
    @Override public boolean isAccountNonExpired()     { return true; }
    @Override public boolean isAccountNonLocked()      { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
}
