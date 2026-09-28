import { useRef, useState } from "react";
import { Platform, PlatformColor, View } from "react-native";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import BookmarkListHeader from "@/components/bookmarks/BookmarkListHeader";
import UpdatingBookmarkList from "@/components/bookmarks/UpdatingBookmarkList";
import InlineSearch from "@/components/search/InlineSearch";
import { ProfileAvatarButton } from "@/components/settings/ProfileAvatarButton";
import AndroidSearchBar from "@/components/ui/AndroidSearchBar";
import { FAB } from "@/components/ui/FAB";
import useAppSettings from "@/lib/settings";
import { parseSharedText } from "@/lib/sharedText";
import { useUploadAsset } from "@/lib/upload";
import { useTranslation } from "@/lib/i18n/hooks";
import { useMenuIconColors } from "@/lib/useMenuIconColors";
import { MenuView } from "@react-native-menu/menu";
import { Plus } from "lucide-react-native";
import { toast as sonnerToast } from "sonner-native";
import { useCreateBookmark } from "@karakeep/shared-react/hooks/bookmarks";
import { BookmarkTypes } from "@karakeep/shared/types/bookmarks";

function useNewBookmarkActions(openNewBookmarkModal: () => void) {
  const { settings } = useAppSettings();
  const { t } = useTranslation();
  const { menuIconColor } = useMenuIconColors();
  const uploadToastIdRef = useRef<string | number | null>(null);
  const createBookmark = useCreateBookmark();

  // Images still uploading from the last multi-select; the success toast is
  // shown once they have all finished.
  const pendingUploadsRef = useRef(0);
  const { uploadAsset } = useUploadAsset(settings, {
    onSuccess: () => {
      pendingUploadsRef.current = Math.max(0, pendingUploadsRef.current - 1);
      if (
        pendingUploadsRef.current === 0 &&
        uploadToastIdRef.current !== null
      ) {
        sonnerToast.success(t("home.image_saved"), {
          id: uploadToastIdRef.current,
        });
        uploadToastIdRef.current = null;
      }
    },
    onError: (e) => {
      pendingUploadsRef.current = Math.max(0, pendingUploadsRef.current - 1);
      if (uploadToastIdRef.current !== null) {
        sonnerToast.error(e, { id: uploadToastIdRef.current });
        uploadToastIdRef.current = null;
      } else {
        sonnerToast.error(e);
      }
    },
  });

  const onPressAction = async ({
    nativeEvent,
  }: {
    nativeEvent: { event: string };
  }) => {
    Haptics.selectionAsync();
    if (nativeEvent.event === "new") {
      openNewBookmarkModal();
    } else if (nativeEvent.event === "library") {
      try {
        uploadToastIdRef.current = sonnerToast.loading(
          t("home.opening_photo_library"),
        );
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: settings.imageQuality,
          allowsMultipleSelection: true,
        });
        if (!result.canceled) {
          if (result.assets.length === 0) {
            sonnerToast.dismiss(uploadToastIdRef.current);
            uploadToastIdRef.current = null;
            return;
          }
          sonnerToast.loading(t("home.uploading_image"), {
            id: uploadToastIdRef.current,
          });
          pendingUploadsRef.current = result.assets.length;
          for (const asset of result.assets) {
            uploadAsset({
              type: asset.mimeType ?? "",
              name: asset.fileName ?? "",
              uri: asset.uri,
            });
          }
        } else {
          sonnerToast.dismiss(uploadToastIdRef.current);
          uploadToastIdRef.current = null;
        }
      } catch {
        if (uploadToastIdRef.current !== null) {
          sonnerToast.error(t("home.failed_open_photo_library"), {
            id: uploadToastIdRef.current,
          });
          uploadToastIdRef.current = null;
        } else {
          sonnerToast.error(t("home.failed_open_photo_library"));
        }
      }
    } else if (nativeEvent.event === "clipboard") {
      if (createBookmark.isPending) return;

      const toastId = sonnerToast.loading(t("home.reading_clipboard"));
      try {
        const contents = (await Clipboard.getStringAsync()).trim();
        if (!contents) {
          sonnerToast.error(t("home.clipboard_empty"), { id: toastId });
          return;
        }

        const parsed = parseSharedText(contents);
        sonnerToast.loading(
          parsed.type === "link" ? t("home.saving_url") : t("home.saving_text"),
          { id: toastId },
        );

        const resp = await (parsed.type === "link"
          ? createBookmark.mutateAsync({
              type: BookmarkTypes.LINK,
              url: parsed.url,
              title: parsed.title,
              source: "mobile",
            })
          : createBookmark.mutateAsync({
              type: BookmarkTypes.TEXT,
              text: contents,
              source: "mobile",
            }));
        sonnerToast.success(
          resp.alreadyExists ? t("home.already_exists") : t("home.saved"),
          {
            id: toastId,
          },
        );
      } catch (e) {
        sonnerToast.error(
          e instanceof Error ? e.message : t("home.failed_save_clipboard"),
          { id: toastId },
        );
      }
    }
  };

  const actions = [
    {
      id: "clipboard",
      title: t("home.menu_clipboard"),
      image: Platform.select({ ios: "clipboard" }),
      imageColor: Platform.select({ ios: menuIconColor }),
    },
    {
      id: "new",
      title: t("home.menu_new_bookmark"),
      image: Platform.select({ ios: "square.and.pencil" }),
      imageColor: Platform.select({ ios: menuIconColor }),
    },
    {
      id: "library",
      title: t("home.menu_photo_library"),
      image: Platform.select({ ios: "photo" }),
      imageColor: Platform.select({ ios: menuIconColor }),
    },
  ];

  return { onPressAction, actions };
}

export default function Home() {
  const { t } = useTranslation();
  const [searchActive, setSearchActive] = useState(false);
  const { onPressAction, actions } = useNewBookmarkActions(() =>
    router.push("/dashboard/bookmarks/new"),
  );

  if (Platform.OS === "android" && searchActive) {
    return <InlineSearch onClose={() => setSearchActive(false)} />;
  }

  return (
    <>
      {Platform.OS === "android" && (
        <AndroidSearchBar
          label={t("home.search_bookmarks")}
          onPress={() => setSearchActive(true)}
          rightElement={<ProfileAvatarButton />}
          trailingElement={<BookmarkListHeader />}
        />
      )}
      <UpdatingBookmarkList query={{ archived: false }} />
      <FAB>
        <MenuView
          onPressAction={onPressAction}
          actions={actions}
          shouldOpenOnLongPress={false}
        >
          <View className="h-full w-full items-center justify-center">
            <Plus
              size={24}
              color={Platform.OS === "ios" ? PlatformColor("label") : "white"}
            />
          </View>
        </MenuView>
      </FAB>
    </>
  );
}
