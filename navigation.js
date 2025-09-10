import { NavigationContainer } from "@react-navigation/native";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import { CastButton } from "react-native-google-cast";
import { Text, View } from "react-native";
import RenderChannel from "./components/RenderChannel";

const Drawer = createDrawerNavigator();

export default function MainStack() {
  const CustomDrawerContent = (props) => {
    return (
      <DrawerContentScrollView {...props}>
        <View style={{ padding: 20 }}>
          <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>
            Channels
          </Text>
        </View>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
    );
  };

  return (
    <NavigationContainer>
      <Drawer.Navigator
        initialRouteName="M4_Sport"
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          drawerStyle: {
            backgroundColor: "#d1400e", // A darker shade of the header color
          },
          drawerActiveTintColor: "#fff", // Active item text color
          drawerInactiveTintColor: "#fff", // Inactive item text color
        }}
      >
        <Drawer.Screen
          name="M4_Sport"
          component={RenderChannel}
          initialParams={{ channel: "mtv4live" }}
          options={{
            title: "M4 Sport",
            headerStyle: {
              backgroundColor: "#f4511e",
            },
            headerTintColor: "#fff",
            headerTitleStyle: {
              fontWeight: "bold",
            },
            headerRight: () => (
              <CastButton
                style={{ width: 40, height: 40, tintColor: "white" }}
              />
            ),
          }}
        />
        <Drawer.Screen
          name="M4_SportPlus"
          component={RenderChannel}
          initialParams={{ channel: "mtv4plus" }}
          options={{
            title: "M4 Sport+",
            headerStyle: {
              backgroundColor: "#f4511e",
            },
            headerTintColor: "#fff",
            headerTitleStyle: {
              fontWeight: "bold",
            },
            headerRight: () => (
              <CastButton
                style={{ width: 40, height: 40, tintColor: "white" }}
              />
            ),
          }}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
