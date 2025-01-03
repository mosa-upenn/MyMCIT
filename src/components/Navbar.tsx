"use client";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  MenuItem,
  Menu,
  useMediaQuery,
  useTheme,
  Hidden,
  Snackbar,
} from "@mui/material";
import { AccountCircle, Brightness3, Brightness7 } from "@mui/icons-material";
import { User, Session } from "@supabase/supabase-js";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { styled } from "@mui/system";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/router";
import { track } from "@vercel/analytics";
import AddReviewButton from "@/components/AddReviewButton";

const StyledLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  &:hover {
    text-decoration: none;
  }
`;

function UserComponent({
  setEmailError,
}: {
  setEmailError: (open: boolean) => void;
}) {
  const router = useRouter();

  const handleUserNavigation = (path: string) => {
    router.push(path);
    handleClose();
  };

  const [user, setUser] = useState<User | null>(null);
  // Additional state for managing the menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        let user = session?.user ?? null;

        // if the user is not null and the email does not end with seas.upenn.edu, don't let the user sign in
        if (user && !user.email?.endsWith("@seas.upenn.edu")) {
          track("Non-SEAS-User-Login-Attempt"); // log the event for analytics
          await supabase.auth.signOut(); // sign out the user
          user = null; // set the user to null
          router.push("/"); // kick the user to '/' route
          // display a toast to the user that they need to use their SEAS email
          setEmailError(true);
        }

        setUser(user);
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, setEmailError]);

  if (user) {
    return (
      <div>
        <IconButton
          onClick={handleMenu}
          size="large"
          edge="end"
          style={{ color: "white" }}
        >
          <AccountCircle />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={handleClose}
          onClick={handleClose}
          PaperProps={{
            elevation: 0,
            sx: {
              overflow: "visible",
              filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
              mt: 1.5,
              "& .MuiAvatar-root": {
                width: 32,
                height: 32,
                ml: -0.5,
                mr: 1,
              },
              "&:before": {
                content: '""',
                display: "block",
                position: "absolute",
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: "background.paper",
                transform: "rotate(45deg)",
                zIndex: 0,
              },
            },
            transformOrigin: "top right",
            anchorOrigin: {
              vertical: "bottom",
              horizontal: "right",
            },
          }}
        >
          <MenuItem
            onClick={() => {
              track("My-Reviews-Navbar-Clicked");
              handleUserNavigation("/reviews/my-reviews");
            }}
          >
            My Reviews
          </MenuItem>
          <MenuItem
            onClick={() => {
              track("Logout");
              supabase.auth.signOut();
            }}
          >
            Logout
          </MenuItem>
        </Menu>
      </div>
    );
  }

  return (
    <Button
      onClick={() => {
        track("LoginClick");
        const baseUrl =
          process.env.NODE_ENV === "production"
            ? process.env.NEXT_PUBLIC_API_URL
            : "http://127.0.0.1:3000/";
        supabase.auth
          .signInWithOAuth({
            provider: "google",
            options: {
              queryParams: {
                hd: "seas.upenn.edu", // only allow UPenn SEAS emails
              },
              redirectTo: `${baseUrl}`, // redirect to route after OAuth complete
            },
          })
          .catch(console.error);
      }}
      style={{ color: "white" }}
    >
      LOGIN
    </Button>
  );
}

export default function Navbar({ themeMode, setThemeMode }: any) {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [emailError, setEmailError] = useState(false);

  function handleThemeChange() {
    track("ThemeChange");
    setThemeMode((prev: string) => (prev === "light" ? "dark" : "light"));
  }

  return (
    <AppBar position="static" sx={{ backgroundColor: "#011F5B" }}>
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <StyledLink href="/" passHref>
            <Image
              src="/MOSA-Square-Logo-01.png"
              alt="UPenn Logo"
              height={36}
              width={36}
              style={{ backgroundColor: "white" }}
            />
          </StyledLink>
          <StyledLink
            href="/"
            passHref
            onClick={() => track("MyMCIT-Icon-Click")}
          >
            <Typography variant="h6" component="div" sx={{ ml: 2 }}>
              MyMCIT
            </Typography>
          </StyledLink>
          <Hidden smDown>
            <div style={{ display: "flex", alignItems: "center" }}>
              <StyledLink
                href="/"
                passHref
                onClick={() => track("Courses-Navbar-Click")}
              >
                <Typography variant="subtitle1" component="div" sx={{ ml: 2 }}>
                  Courses
                </Typography>
              </StyledLink>
              <StyledLink
                href="/reviews"
                passHref
                onClick={() => track("Reviews-Navbar-Click")}
              >
                <Typography variant="subtitle1" component="div" sx={{ ml: 2 }}>
                  Reviews
                </Typography>
              </StyledLink>
            </div>
          </Hidden>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ marginRight: 10 }}>
            <AddReviewButton />
          </div>
          <IconButton color="inherit" onClick={handleThemeChange}>
            {themeMode === "light" ? <Brightness7 /> : <Brightness3 />}
          </IconButton>
          <UserComponent setEmailError={setEmailError} />
        </div>
      </Toolbar>
      <Snackbar
        open={emailError}
        autoHideDuration={6000}
        onClose={() => setEmailError(false)}
        message="Login failed. Please use your SEAS Penn email."
      />
    </AppBar>
  );
}
